package websocket

import (
	"encoding/json"
	"testing"
)

func TestVoteEventSerialization(t *testing.T) {
	event := VoteEvent{
		PollID:   "poll_123",
		OptionID: "option_abc",
		Username: "kamali",
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("Failed to marshal VoteEvent: %v", err)
	}

	var parsed VoteEvent
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("Failed to unmarshal VoteEvent: %v", err)
	}

	if parsed.PollID != event.PollID {
		t.Errorf("Expected PollID %s, got %s", event.PollID, parsed.PollID)
	}
	if parsed.OptionID != event.OptionID {
		t.Errorf("Expected OptionID %s, got %s", event.OptionID, parsed.OptionID)
	}
	if parsed.Username != event.Username {
		t.Errorf("Expected Username %s, got %s", event.Username, parsed.Username)
	}
}
