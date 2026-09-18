package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"

	"pulspoll/backend/database"
	"pulspoll/backend/models"
)

type CreatePollRequest struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

func CreatePoll(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	var req CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request payload"})
		return
	}

	req.Question = strings.TrimSpace(req.Question)
	if req.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Question is required"})
		return
	}

	if len(req.Options) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "At least 2 options are required"})
		return
	}

	var pollOptions []models.PollOption
	for _, opt := range req.Options {
		optStr := strings.TrimSpace(opt)
		if optStr != "" {
			pollOptions = append(pollOptions, models.PollOption{
				ID:    bson.NewObjectID(),
				Text:  optStr,
				Votes: 0,
			})
		}
	}

	if len(pollOptions) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "At least 2 valid options are required"})
		return
	}

	poll := models.Poll{
		ID:        bson.NewObjectID(),
		CreatorID: userID.(string),
		Question:  req.Question,
		Options:   pollOptions,
		CreatedAt: time.Now().UTC(),
	}

	collection := database.GetCollection("polls")
	_, err := collection.InsertOne(c.Request.Context(), poll)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create poll"})
		return
	}

	c.JSON(http.StatusCreated, poll)
}

func GetPoll(c *gin.Context) {
	pollID := c.Param("id")
	objID, err := bson.ObjectIDFromHex(pollID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid poll ID"})
		return
	}

	collection := database.GetCollection("polls")
	var poll models.Poll
	err = collection.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&poll)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Poll not found"})
		return
	}

	// Fetch votes to get voters
	votesCollection := database.GetCollection("votes")
	cursor, err := votesCollection.Find(c.Request.Context(), bson.M{"poll_id": pollID})
	if err == nil {
		defer cursor.Close(c.Request.Context())
		var votes []models.Vote
		if err = cursor.All(c.Request.Context(), &votes); err == nil {
			votersByOption := make(map[string][]string)
			for _, v := range votes {
				name := v.Username
				// Legacy votes stored before username was in the JWT — resolve from users collection
				if name == "" && v.UserID != "" {
					userObjID, uerr := bson.ObjectIDFromHex(v.UserID)
					if uerr == nil {
						var u models.User
						usersCollection := database.GetCollection("users")
						if uerr = usersCollection.FindOne(c.Request.Context(), bson.M{"_id": userObjID}).Decode(&u); uerr == nil {
							name = u.Username
						}
					}
				}
				if name != "" {
					votersByOption[v.OptionID] = append(votersByOption[v.OptionID], name)
				}
			}
			for i, opt := range poll.Options {
				optIDStr := opt.ID.Hex()
				if voters, ok := votersByOption[optIDStr]; ok {
					poll.Options[i].Voters = voters
				} else {
					poll.Options[i].Voters = []string{}
				}
			}
		}
	}

	// Fetch creator username
	if poll.CreatorID != "" {
		usersCollection := database.GetCollection("users")
		var creator models.User
		creatorObjID, err := bson.ObjectIDFromHex(poll.CreatorID)
		if err == nil {
			err = usersCollection.FindOne(c.Request.Context(), bson.M{"_id": creatorObjID}).Decode(&creator)
			if err == nil {
				poll.CreatedByUsername = creator.Username
			}
		}
	}

	c.JSON(http.StatusOK, poll)
}

func ListPolls(c *gin.Context) {
	collection := database.GetCollection("polls")
	cursor, err := collection.Find(c.Request.Context(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch polls"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var polls []models.Poll
	if err = cursor.All(c.Request.Context(), &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to decode polls"})
		return
	}

	if polls == nil {
		polls = []models.Poll{}
	}

	c.JSON(http.StatusOK, polls)
}

func ListMyPolls(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	collection := database.GetCollection("polls")
	cursor, err := collection.Find(c.Request.Context(), bson.M{"creator_id": userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch polls"})
		return
	}
	defer cursor.Close(c.Request.Context())

	var polls []models.Poll
	if err = cursor.All(c.Request.Context(), &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to decode polls"})
		return
	}

	if polls == nil {
		polls = []models.Poll{}
	}

	c.JSON(http.StatusOK, polls)
}

func CheckVoteStatus(c *gin.Context) {
	pollID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	collection := database.GetCollection("votes")
	var vote models.Vote
	err := collection.FindOne(c.Request.Context(), bson.M{
		"poll_id": pollID,
		"user_id": userID.(string),
	}).Decode(&vote)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"has_voted": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"has_voted": true,
		"option_id": vote.OptionID,
	})
}

func DeletePoll(c *gin.Context) {
	pollID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	objID, err := bson.ObjectIDFromHex(pollID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid poll ID"})
		return
	}

	pollsCollection := database.GetCollection("polls")

	// 1. Find the poll to verify ownership before deleting
	var poll models.Poll
	err = pollsCollection.FindOne(c.Request.Context(), bson.M{"_id": objID}).Decode(&poll)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Poll not found"})
		return
	}

	// 2. Ownership check — only the creator may delete
	if poll.CreatorID != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"message": "You are not allowed to delete this poll"})
		return
	}

	// 3. Delete the poll document
	_, err = pollsCollection.DeleteOne(c.Request.Context(), bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete poll"})
		return
	}

	// 4. Delete all votes belonging to this poll (non-fatal if it fails)
	votesCollection := database.GetCollection("votes")
	_, err = votesCollection.DeleteMany(c.Request.Context(), bson.M{"poll_id": pollID})
	if err != nil {
		println("WARN: failed to delete votes for poll", pollID, ":", err.Error())
	}

	c.JSON(http.StatusOK, gin.H{"message": "Poll deleted successfully"})
}
