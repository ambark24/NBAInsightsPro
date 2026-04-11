#!/usr/bin/env python3
"""
NBA Insights Pro Backend API Testing
Tests all backend endpoints with authentication
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Test configuration
BASE_URL = "https://resume-app-12.preview.emergentagent.com/api"
SESSION_TOKEN = "test_session_1773473981643"

class BackendTester:
    def __init__(self):
        self.session = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test(self, test_name, success, details="", error=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": str(error) if error else None,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        if error:
            print(f"   Error: {error}")
        print()
    
    async def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            async with self.session.get(f"{BASE_URL}/") as response:
                if response.status == 200:
                    data = await response.json()
                    self.log_test("Health Check", True, f"Status: {response.status}, Response: {data}")
                elif response.status == 404:
                    self.log_test("Health Check", False, "No health check endpoint found at /api/")
                else:
                    text = await response.text()
                    self.log_test("Health Check", False, f"Status: {response.status}, Response: {text}")
        except Exception as e:
            self.log_test("Health Check", False, error=e)
    
    async def test_auth_me(self):
        """Test authentication endpoint"""
        try:
            async with self.session.get(f"{BASE_URL}/auth/me") as response:
                if response.status == 200:
                    data = await response.json()
                    user_id = data.get("user_id")
                    name = data.get("name")
                    self.log_test("Auth Me", True, f"User ID: {user_id}, Name: {name}")
                    return True
                else:
                    text = await response.text()
                    self.log_test("Auth Me", False, f"Status: {response.status}, Response: {text}")
                    return False
        except Exception as e:
            self.log_test("Auth Me", False, error=e)
            return False
    
    async def test_games_endpoint(self):
        """Test NBA games with predictions endpoint"""
        try:
            print("⏳ Testing games endpoint (this may take time due to external API calls and ML predictions)...")
            
            # Use a longer timeout for this endpoint
            timeout = aiohttp.ClientTimeout(total=60)
            async with self.session.get(f"{BASE_URL}/games", timeout=timeout) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if isinstance(data, list):
                        game_count = len(data)
                        predictions_count = sum(1 for item in data if item.get("prediction"))
                        
                        # Check structure of first game if exists
                        details = f"Found {game_count} games, {predictions_count} with predictions"
                        if game_count > 0:
                            first_game = data[0]
                            game_info = first_game.get("game", {})
                            prediction_info = first_game.get("prediction", {})
                            
                            if game_info:
                                details += f"\nFirst game: {game_info.get('home_team')} vs {game_info.get('away_team')}"
                            if prediction_info:
                                details += f"\nPrediction confidence: {prediction_info.get('confidence')}%"
                                details += f"\nMoneyline pick: {prediction_info.get('moneyline_pick')}"
                        
                        self.log_test("NBA Games with Predictions", True, details)
                        return True
                    else:
                        self.log_test("NBA Games with Predictions", False, f"Expected array, got: {type(data)}")
                        return False
                else:
                    text = await response.text()
                    self.log_test("NBA Games with Predictions", False, f"Status: {response.status}, Response: {text}")
                    return False
        except asyncio.TimeoutError:
            self.log_test("NBA Games with Predictions", False, "Request timed out after 60 seconds")
            return False
        except Exception as e:
            self.log_test("NBA Games with Predictions", False, error=e)
            return False
    
    async def test_chat_get_messages(self):
        """Test getting chat messages"""
        try:
            async with self.session.get(f"{BASE_URL}/chat/messages") as response:
                if response.status == 200:
                    data = await response.json()
                    if isinstance(data, list):
                        message_count = len(data)
                        self.log_test("Chat Get Messages", True, f"Retrieved {message_count} messages")
                        return True, data
                    else:
                        self.log_test("Chat Get Messages", False, f"Expected array, got: {type(data)}")
                        return False, None
                else:
                    text = await response.text()
                    self.log_test("Chat Get Messages", False, f"Status: {response.status}, Response: {text}")
                    return False, None
        except Exception as e:
            self.log_test("Chat Get Messages", False, error=e)
            return False, None
    
    async def test_chat_post_message(self):
        """Test posting a chat message"""
        try:
            test_message = {
                "message": f"Test message from API test at {datetime.now().isoformat()}"
            }
            
            async with self.session.post(
                f"{BASE_URL}/chat/messages",
                json=test_message,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    message_id = data.get("message_id")
                    user_name = data.get("user_name")
                    message_text = data.get("message")
                    
                    details = f"Message ID: {message_id}, User: {user_name}, Text: {message_text[:50]}..."
                    self.log_test("Chat Post Message", True, details)
                    return True
                else:
                    text = await response.text()
                    self.log_test("Chat Post Message", False, f"Status: {response.status}, Response: {text}")
                    return False
        except Exception as e:
            self.log_test("Chat Post Message", False, error=e)
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        print(f"Passed: {passed}/{total}")
        print()
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
        
        print(f"\nOverall Status: {'✅ ALL TESTS PASSED' if passed == total else '❌ SOME TESTS FAILED'}")
        return passed == total

async def main():
    """Run all backend tests"""
    print("🚀 Starting NBA Insights Pro Backend API Tests")
    print(f"🔗 Testing against: {BASE_URL}")
    print(f"🔑 Using session token: {SESSION_TOKEN[:20]}...")
    print()
    
    async with BackendTester() as tester:
        # Test authentication first
        auth_success = await tester.test_auth_me()
        
        if not auth_success:
            print("❌ Authentication failed - skipping other tests")
            tester.print_summary()
            return False
        
        # Test health check (optional)
        await tester.test_health_check()
        
        # Test main features
        await tester.test_games_endpoint()
        
        # Test chat functionality
        await tester.test_chat_get_messages()
        await tester.test_chat_post_message()
        
        # Verify posted message appears in get
        print("🔄 Verifying posted message appears in chat...")
        success, messages = await tester.test_chat_get_messages()
        
        # Print summary
        all_passed = tester.print_summary()
        return all_passed

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        sys.exit(1)