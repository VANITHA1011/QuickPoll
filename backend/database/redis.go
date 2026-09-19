package database

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient holds the reusable Redis client for the application.
var RedisClient *redis.Client

// ConnectRedis creates a Redis client, pings the server,
// and stores the client for use by later modules.
func ConnectRedis(ctx context.Context) error {
	redisURL := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	u, err := url.Parse(redisURL)
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: invalid REDIS_URL format")
	}

	// Extract options
	addr := u.Host
	hostname := u.Hostname()
	password, _ := u.User.Password()
	username := u.User.Username()

	opts := &redis.Options{
		Addr:     addr,
		Username: username,
		Password: password,
	}

	// Ensure proper TLS configuration for Upstash / rediss:// URLs
	if u.Scheme == "rediss" || strings.Contains(redisURL, ".upstash.io") {
		opts.TLSConfig = &tls.Config{
			ServerName:         hostname,
			MinVersion:         tls.VersionTLS12,
			InsecureSkipVerify: true,
		}
	}

	client := redis.NewClient(opts)

	// Ping with a timeout to verify the connection
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	RedisClient = client

	fmt.Println("Redis connected successfully!")

	return nil
}
