# WebSocket Protocol Documentation

## Message Format
All messages follow this basic structure:
```json
{
    "type": "message_type",
    "data": {
        // message-specific data
    }
}
