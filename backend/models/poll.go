package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type PollOption struct {
	ID     bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Text   string        `bson:"text" json:"text"`
	Votes  int           `bson:"votes" json:"votes"`
	Voters []string      `bson:"-" json:"voters"`
}

type Poll struct {
	ID                bson.ObjectID `bson:"_id,omitempty" json:"id"`
	CreatorID         string        `bson:"creator_id" json:"creator_id"`
	CreatedByUsername string        `bson:"-" json:"created_by_username"`
	Question          string        `bson:"question" json:"question"`
	Options           []PollOption  `bson:"options" json:"options"`
	Status            string        `bson:"status" json:"status"` // e.g. "LIVE", "CLOSED"
	CreatedAt         time.Time     `bson:"created_at" json:"created_at"`
	ExpiresAt         *time.Time    `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
}
