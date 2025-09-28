import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from gemini_client import GeminiTravelAgent
from mcp_manager import MCPManager

load_dotenv()

app = FastAPI(title="AI Travel Agent API")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
travel_agent = None
mcp_manager = None


class TravelRequest(BaseModel):
    message: str
    user_id: str = "hackathon_user"
    conversation_id: str = None  # Track conversation context
    force_refresh: bool = False  # Force new API calls


class TravelResponse(BaseModel):
    success: bool
    data: dict = None
    error: str = None


@app.on_startup
async def startup_event():
    global travel_agent, mcp_manager
    print("🚀 Starting AI Travel Agent...")

    # Initialize MCP Manager
    mcp_manager = MCPManager()
    await mcp_manager.initialize_servers()

    # Initialize Gemini Travel Agent
    travel_agent = GeminiTravelAgent(mcp_manager)
    await travel_agent.initialize()

    print("✅ All systems ready!")


@app.post("/api/plan-trip", response_model=TravelResponse)
async def plan_trip(request: TravelRequest):
    try:
        if not travel_agent:
            raise HTTPException(status_code=500, detail="Travel agent not initialized")

        print(f"📝 Planning trip: {request.message}")

        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or f"conv_{request.user_id}_{int(asyncio.get_event_loop().time())}"

        # Use Gemini to plan the trip with smart caching
        result = await travel_agent.plan_trip(
            request.message,
            conversation_id=conversation_id,
            force_refresh=request.force_refresh
        )

        # Add conversation ID to response
        result["conversation_id"] = conversation_id

        return TravelResponse(
            success=True,
            data=result
        )

    except Exception as e:
        print(f"❌ Error planning trip: {str(e)}")
        return TravelResponse(
            success=False,
            error=str(e)
        )


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "mcp_servers": mcp_manager.get_server_status() if mcp_manager else {},
        "gemini": "connected" if travel_agent else "disconnected"
    }


@app.get("/")
async def root():
    return {"message": "AI Travel Agent API - Ready for hackathon! 🚀"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)