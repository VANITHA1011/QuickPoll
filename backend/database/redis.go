package database

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
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

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: invalid REDIS_URL format")
	}

	// Ensure proper TLS configuration with SNI ServerName for Upstash / rediss:// URLs
	if strings.HasPrefix(redisURL, "rediss://") || strings.Contains(redisURL, ".upstash.io") {
		host, _, err := net.SplitHostPort(opts.Addr)
		if err != nil || host == "" {
			host = opts.Addr
		}
		opts.TLSConfig = &tls.Config{
			ServerName: host,
			MinVersion: tls.VersionTLS12,
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
