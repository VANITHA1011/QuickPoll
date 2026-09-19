package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestAuthRequiredMissingHeader(t *testing.T) {
	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	r.Use(AuthRequired())
	r.GET("/protected", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	c.Request, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	r.ServeHTTP(w, c.Request)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 Unauthorized, got %d", w.Code)
	}
}

func TestAuthRequiredInvalidBearerFormat(t *testing.T) {
	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	r.Use(AuthRequired())
	r.GET("/protected", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	c.Request, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	c.Request.Header.Set("Authorization", "Basic 12345")
	r.ServeHTTP(w, c.Request)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for bad header format, got %d", w.Code)
	}
}

func TestAuthRequiredValidToken(t *testing.T) {
	secret := "test-secret-key-123"
	os.Setenv("JWT_SECRET", secret)
	defer os.Unsetenv("JWT_SECRET")

	// Generate valid token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  "user_abc_123",
		"username": "testuser",
		"exp":      time.Now().Add(time.Hour).Unix(),
	})
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("Failed to sign token: %v", err)
	}

	w := httptest.NewRecorder()
	c, r := gin.CreateTestContext(w)

	var extractedUserID, extractedUsername string
	r.Use(AuthRequired())
	r.GET("/protected", func(ctx *gin.Context) {
		uid, _ := ctx.Get("userID")
		uname, _ := ctx.Get("username")
		extractedUserID = uid.(string)
		extractedUsername = uname.(string)
		ctx.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	c.Request, _ = http.NewRequest(http.MethodGet, "/protected", nil)
	c.Request.Header.Set("Authorization", "Bearer "+tokenString)
	r.ServeHTTP(w, c.Request)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200 OK, got %d", w.Code)
	}
	if extractedUserID != "user_abc_123" {
		t.Errorf("Expected userID user_abc_123, got %s", extractedUserID)
	}
	if extractedUsername != "testuser" {
		t.Errorf("Expected username testuser, got %s", extractedUsername)
	}
}
