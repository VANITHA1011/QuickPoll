package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var Client *mongo.Client

func Connect(ctx context.Context) error {
	mongoURI := os.Getenv("MONGODB_URI")

	if mongoURI == "" {
		return fmt.Errorf("MONGODB_URI is not set")
	}

	clientOptions := options.Client().ApplyURI(mongoURI)

	client, err := mongo.Connect(clientOptions)
	if err != nil {
		return fmt.Errorf("failed to create MongoDB client: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx, nil); err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	Client = client

	fmt.Println("MongoDB connected successfully!")

	// Ensure indexes for collections (e.g. unique email)
	if err := EnsureIndexes(ctx); err != nil {
		fmt.Printf("Warning: failed to ensure indexes: %v\n", err)
	}

	return nil
}

// GetCollection returns a handle to the specified collection in the database.
func GetCollection(collectionName string) *mongo.Collection {
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "pulsepoll"
	}
	return Client.Database(dbName).Collection(collectionName)
}

// EnsureIndexes creates necessary database indexes, such as a unique index on email.
func EnsureIndexes(ctx context.Context) error {
	collection := GetCollection("users")
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	_, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return fmt.Errorf("failed to create unique index on email: %w", err)
	}

	// Votes collection index (unique vote per user per poll)
	votesCollection := GetCollection("votes")
	voteIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "poll_id", Value: 1},
			{Key: "user_id", Value: 1},
		},
		Options: options.Index().SetUnique(true),
	}
	_, err = votesCollection.Indexes().CreateOne(ctx, voteIndexModel)
	if err != nil {
		return fmt.Errorf("failed to create unique index on votes: %w", err)
	}

	return nil
}
