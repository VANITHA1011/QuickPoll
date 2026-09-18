package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"

	"pulspoll/backend/database"
	"pulspoll/backend/models"
	ws "pulspoll/backend/websocket"
)

type VoteRequest struct {
	OptionID string `json:"option_id"`
}

func CastVote(c *gin.Context) {
	pollID := c.Param("id")
	pollObjID, err := bson.ObjectIDFromHex(pollID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid poll ID"})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	username, _ := c.Get("username")
	usernameStr, _ := username.(string)

	var req VoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request payload"})
		return
	}

	optionObjID, err := bson.ObjectIDFromHex(req.OptionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid option ID"})
		return
	}

	// 1. Attempt to record the vote in the votes collection
	votesCollection := database.GetCollection("votes")
	voteRecord := models.Vote{
		ID:        bson.NewObjectID(),
		PollID:    pollID,
		UserID:    userID.(string),
		Username:  usernameStr,
		OptionID:  req.OptionID,
		CreatedAt: time.Now().UTC(),
	}

	_, err = votesCollection.InsertOne(c.Request.Context(), voteRecord)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"message": "You have already voted in this poll"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to record vote"})
		return
	}

	// 2. Update MongoDB poll options count
	collection := database.GetCollection("polls")

	// Use array filters to update the specific option's vote count
	filter := bson.M{"_id": pollObjID, "options._id": optionObjID}
	update := bson.M{"$inc": bson.M{"options.$.votes": 1}}

	result, err := collection.UpdateOne(c.Request.Context(), filter, update)
	if err != nil || result.MatchedCount == 0 {
		// Rollback vote record if poll update fails (edge case, not strictly necessary but clean)
		votesCollection.DeleteOne(c.Request.Context(), bson.M{"_id": voteRecord.ID})
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to record vote or option not found"})
		return
	}

	// 3. Update Redis realtime counter and publish live vote event
	if database.RedisClient != nil {
		redisKey := fmt.Sprintf("poll:%s:votes:%s", pollID, req.OptionID)
		if err := database.RedisClient.Incr(context.Background(), redisKey).Err(); err != nil {
			println("WARN: Redis Incr error for key", redisKey, ":", err.Error())
		}

		ws.PublishVoteEvent(pollID, req.OptionID, usernameStr)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vote recorded successfully"})
}
