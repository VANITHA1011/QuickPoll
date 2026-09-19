package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"pulspoll/backend/database"
	"pulspoll/backend/handlers"
	"pulspoll/backend/middleware"
	ws "pulspoll/backend/websocket"
)

// corsMiddleware adds standard CORS headers for local frontend integration.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	// Connect to MongoDB
	if err := database.Connect(context.Background()); err != nil {
		log.Fatal(err)
	}

	// Connect to Redis
	if err := database.ConnectRedis(context.Background()); err != nil {
		log.Println("Warning: Redis connection failed:", err)
	}

	// Start WebSocket Hub
	go ws.AppHub.Run()

	// Create Gin router
	router := gin.Default()

	// Apply CORS middleware
	router.Use(corsMiddleware())

	// Root health check endpoint (Keep unchanged)
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "PulsePoll backend is running!",
		})
	})

	// Auth routes
	authGroup := router.Group("/api/auth")
	{
		authGroup.POST("/register", handlers.Register)
		authGroup.POST("/login", handlers.Login)
	}

	// Poll routes (public)
	router.GET("/api/polls", handlers.ListPolls)
	router.GET("/api/polls/:id", handlers.GetPoll)

	// WebSocket route
	router.GET("/api/ws/polls/:id", handlers.ServeWS)

	// Protected routes
	protected := router.Group("/api")
	protected.Use(middleware.AuthRequired())
	{
		protected.POST("/polls", handlers.CreatePoll)
		protected.GET("/user/polls", handlers.ListMyPolls)
		protected.POST("/polls/:id/vote", handlers.CastVote)
		protected.GET("/polls/:id/voted", handlers.CheckVoteStatus)
		protected.DELETE("/polls/:id", handlers.DeletePoll)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("Server starting on %s", addr)
	router.Run(addr)
}
