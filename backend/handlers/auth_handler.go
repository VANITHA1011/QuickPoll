package handlers

import (
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"

	"pulspoll/backend/database"
	"pulspoll/backend/models"
)

// RegisterRequest defines the expected payload for user registration.
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// emailRegex is a compiled regular expression for validating standard email formats.
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// Register handles user registration (POST /api/auth/register).
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request payload",
		})
		return
	}

	// 1. Sanitize & Validate Username
	username := strings.TrimSpace(req.Username)
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Username is required",
		})
		return
	}
	if len(username) < 2 || len(username) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Username must be between 2 and 50 characters",
		})
		return
	}

	// 2. Sanitize & Validate Email
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Email is required",
		})
		return
	}
	if !emailRegex.MatchString(email) {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Please enter a valid email address",
		})
		return
	}

	// 3. Validate Password
	if req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Password is required",
		})
		return
	}
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Password must be at least 8 characters long",
		})
		return
	}

	collection := database.GetCollection("users")

	// 4. Duplicate Check (Search MongoDB users collection for existing email)
	var existingUser models.User
	err := collection.FindOne(c.Request.Context(), bson.M{"email": email}).Decode(&existingUser)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"message": "Email already registered",
		})
		return
	} else if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Error checking user existence",
		})
		return
	}

	// 5. Password Security (bcrypt hash generation)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to securely process password",
		})
		return
	}

	// 6. Create User Model
	newUser := models.User{
		ID:           bson.NewObjectID(),
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
		CreatedAt:    time.Now().UTC(),
	}

	// 7. Insert into MongoDB users collection
	_, err = collection.InsertOne(c.Request.Context(), newUser)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{
				"message": "Email already registered",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Failed to create user account",
		})
		return
	}

	// 8. Success Response (HTTP 201 Created)
	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful",
	})
}

// Login handles user authentication and JWT generation (POST /api/auth/login)
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request payload"})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Email and password are required"})
		return
	}

	collection := database.GetCollection("users")
	var user models.User
	err := collection.FindOne(c.Request.Context(), bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid email or password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Database error"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid email or password"})
		return
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "JWT secret not configured"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID.Hex(),
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(),
	})

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   tokenString,
		"user": gin.H{
			"id":       user.ID.Hex(),
			"username": user.Username,
			"email":    user.Email,
		},
	})
}
