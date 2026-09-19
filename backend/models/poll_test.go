package models

import (
	"encoding/json"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestPollSerialization(t *testing.T) {
	now := time.Now().UTC()
	expires := now.Add(24 * time.Hour)

	poll := Poll{
		ID:        bson.NewObjectID(),
		CreatorID: "creator_123",
		Question:  "Which tech stack is best?",
		Status:    "LIVE",
		CreatedAt: now,
		ExpiresAt: &expires,
		Options: []PollOption{
			{
				ID:    bson.NewObjectID(),
				Text:  "Go + React",
				Votes: 10,
				Voters: []string{"alice", "bob"},
			},
			{
				ID:    bson.NewObjectID(),
				Text:  "Node + Vue",
				Votes: 4,
				Voters: []string{"charlie"},
			},
		},
	}

	data, err := json.Marshal(poll)
	if err != nil {
		t.Fatalf("Failed to marshal Poll: %v", err)
	}

	var parsed Poll
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal Poll: %v", err)
	}

	if parsed.Question != poll.Question {
		t.Errorf("Expected Question '%s', got '%s'", poll.Question, parsed.Question)
	}
	if parsed.Status != "LIVE" {
		t.Errorf("Expected Status 'LIVE', got '%s'", parsed.Status)
	}
	if len(parsed.Options) != 2 {
		t.Errorf("Expected 2 options, got %d", len(parsed.Options))
	}
}

func TestPollExpirationLogic(t *testing.T) {
	past := time.Now().UTC().Add(-1 * time.Hour)
	future := time.Now().UTC().Add(1 * time.Hour)

	expiredPoll := Poll{
		Question:  "Expired Poll",
		ExpiresAt: &past,
		Status:    "LIVE",
	}

	activePoll := Poll{
		Question:  "Active Poll",
		ExpiresAt: &future,
		Status:    "LIVE",
	}

	isExpired := func(p Poll) bool {
		if p.Status == "CLOSED" {
			return true
		}
		if p.ExpiresAt != nil && time.Now().UTC().After(*p.ExpiresAt) {
			return true
		}
		return false
	}

	if !isExpired(expiredPoll) {
		t.Errorf("Expected expiredPoll to be evaluated as expired")
	}
	if isExpired(activePoll) {
		t.Errorf("Expected activePoll to be evaluated as not expired")
	}
}
