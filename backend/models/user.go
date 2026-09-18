package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// User represents a registered user in the PulsePoll application.
// This struct is used for MongoDB storage and JSON API responses.
type User struct {
	// ID is the unique MongoDB document identifier.
	ID bson.ObjectID `bson:"_id,omitempty" json:"id"`

	// Username is the display name chosen by the user.
	Username string `bson:"username" json:"username"`

	// Email is the user's email address, used for login.
	Email string `bson:"email" json:"email"`

	// PasswordHash stores the bcrypt-hashed password.
	// It is never exposed in JSON API responses.
	PasswordHash string `bson:"password_hash" json:"-"`

	// CreatedAt records when the user account was created.
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
}
