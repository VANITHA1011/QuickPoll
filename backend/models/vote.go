package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Vote struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID    string        `bson:"poll_id" json:"poll_id"`
	UserID    string        `bson:"user_id" json:"user_id"`
	Username  string        `bson:"username" json:"username"`
	OptionID  string        `bson:"option_id" json:"option_id"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}
