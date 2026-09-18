package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"pulspoll/backend/database"
)

type Client struct {
	Conn   *websocket.Conn
	PollID string
}

type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mutex      sync.Mutex
}

var AppHub = Hub{
	clients:    make(map[*Client]bool),
	register:   make(chan *Client),
	unregister: make(chan *Client),
	broadcast:  make(chan []byte),
}

func (h *Hub) Run() {
	go h.listenToRedis()
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("[WS] Client connected for poll_id=%s (total clients=%d)", client.PollID, len(h.clients))
		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Conn.Close()
				log.Printf("[WS] Client disconnected for poll_id=%s (total clients=%d)", client.PollID, len(h.clients))
			}
			h.mutex.Unlock()
		}
	}
}

func (h *Hub) Register(c *Client) {
	h.register <- c
}

func (h *Hub) Unregister(c *Client) {
	h.unregister <- c
}

type VoteEvent struct {
	PollID   string `json:"poll_id"`
	OptionID string `json:"option_id"`
	Username string `json:"username"`
}

func (h *Hub) listenToRedis() {
	if database.RedisClient == nil {
		log.Println("[WS] Redis is not connected, WebSocket pub/sub will not work.")
		return
	}

	log.Println("[WS] Subscribed to Redis channel: poll_votes")
	pubsub := database.RedisClient.Subscribe(context.Background(), "poll_votes")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		var event VoteEvent
		if err := json.Unmarshal([]byte(msg.Payload), &event); err == nil {
			log.Printf("[WS] Redis event received: poll_id=%s option_id=%s username=%s", event.PollID, event.OptionID, event.Username)
			h.broadcastToPoll(event.PollID, []byte(msg.Payload))
		} else {
			log.Printf("[WS] Failed to unmarshal Redis message: %v", err)
		}
	}
}

func (h *Hub) broadcastToPoll(pollID string, message []byte) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	count := 0
	for client := range h.clients {
		if client.PollID == pollID {
			err := client.Conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Printf("[WS] Write error for poll_id=%s, removing client: %v", pollID, err)
				client.Conn.Close()
				delete(h.clients, client)
			} else {
				count++
			}
		}
	}
	log.Printf("[WS] Broadcast to %d client(s) watching poll_id=%s", count, pollID)
}

func PublishVoteEvent(pollID, optionID, username string) {
	if database.RedisClient == nil {
		return
	}
	event := VoteEvent{
		PollID:   pollID,
		OptionID: optionID,
		Username: username,
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("[Redis] Marshal error for VoteEvent: %v", err)
		return
	}
	if err := database.RedisClient.Publish(context.Background(), "poll_votes", payload).Err(); err != nil {
		log.Printf("[Redis] Publish error for poll_votes: %v", err)
	}
}
