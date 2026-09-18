package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	ws "pulspoll/backend/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local dev
	},
}

func ServeWS(c *gin.Context) {
	pollID := c.Param("id")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("[WS] WebSocket upgrade error:", err)
		return
	}

	log.Printf("[WS] New WebSocket connection for poll_id=%s", pollID)

	client := &ws.Client{
		Conn:   conn,
		PollID: pollID,
	}

	ws.AppHub.Register(client)

	// Keep connection alive until closed
	go func() {
		defer ws.AppHub.Unregister(client)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}
