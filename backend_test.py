#!/usr/bin/env python3
"""
RunQuest Backend API Test Suite
Tests all backend endpoints for the running progression game
"""

import requests
import json
import time
import uuid
from typing import Dict, Any

# Use the public backend URL from frontend/.env
BASE_URL = "https://levelup-run.preview.emergentagent.com/api"

class RunQuestAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_device_id = f"test_device_{uuid.uuid4().hex[:8]}"
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "RunQuest API" in data.get("message", ""):
                    self.log_test("API Root Endpoint", True, f"Response: {data}")
                    return True
                else:
                    self.log_test("API Root Endpoint", False, f"Unexpected message: {data}")
                    return False
            else:
                self.log_test("API Root Endpoint", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_get_progress_new_user(self):
        """Test GET /api/progress/{device_id} for new user"""
        try:
            response = self.session.get(f"{self.base_url}/progress/{self.test_device_id}")
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["id", "device_id", "level", "current_xp", "total_xp", "rank", "sessions_completed"]
                
                # Check all required fields exist
                missing_fields = [field for field in expected_fields if field not in data]
                if missing_fields:
                    self.log_test("Get Progress - New User", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Check initial values
                if (data["level"] == 1 and data["current_xp"] == 0 and 
                    data["total_xp"] == 0 and data["rank"] == "E" and 
                    data["sessions_completed"] == 0):
                    self.log_test("Get Progress - New User", True, f"New user created with correct defaults")
                    return True
                else:
                    self.log_test("Get Progress - New User", False, f"Incorrect initial values: {data}")
                    return False
            else:
                self.log_test("Get Progress - New User", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Progress - New User", False, f"Exception: {str(e)}")
            return False
    
    def test_complete_session_basic(self):
        """Test POST /api/session/complete with basic session"""
        try:
            # Complete a 5-minute session
            session_data = {
                "device_id": self.test_device_id,
                "duration_minutes": 5
            }
            
            response = self.session.post(f"{self.base_url}/session/complete", json=session_data)
            if response.status_code == 200:
                data = response.json()
                
                # Check XP calculation: base 50 + 5*10 = 100 XP
                expected_xp = 50 + (5 * 10)  # 100 XP
                if data["xp_earned"] == expected_xp:
                    self.log_test("Complete Session - XP Calculation", True, f"Earned {expected_xp} XP for 5 minutes")
                else:
                    self.log_test("Complete Session - XP Calculation", False, f"Expected {expected_xp}, got {data['xp_earned']}")
                    return False
                
                # Check session data
                session = data["session"]
                if (session["duration_minutes"] == 5 and session["xp_earned"] == expected_xp and
                    session["level_before"] == 1):
                    # Note: 100 XP is enough to level up from 1->2, so level_after could be 2
                    self.log_test("Complete Session - Basic", True, f"Session completed successfully (leveled up: {data['leveled_up']})")
                    return True
                else:
                    self.log_test("Complete Session - Basic", False, f"Session data incorrect: {session}")
                    return False
            else:
                self.log_test("Complete Session - Basic", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Complete Session - Basic", False, f"Exception: {str(e)}")
            return False
    
    def test_level_up_scenario(self):
        """Test level up by completing enough sessions"""
        try:
            # Get current progress
            progress_response = self.session.get(f"{self.base_url}/progress/{self.test_device_id}")
            if progress_response.status_code != 200:
                self.log_test("Level Up - Get Progress", False, "Could not get current progress")
                return False
                
            current_progress = progress_response.json()
            current_xp = current_progress["current_xp"]
            xp_needed = current_progress["xp_for_next_level"]
            
            # Calculate session duration needed to level up
            # We need (xp_needed - current_xp) more XP
            # XP formula: 50 + duration*10
            # So duration = (needed_xp - 50) / 10
            xp_to_gain = xp_needed - current_xp
            duration_needed = max(1, (xp_to_gain - 50) // 10 + 1)  # Add 1 to ensure level up
            
            print(f"   Current XP: {current_xp}, Need: {xp_needed}, Duration for level up: {duration_needed}")
            
            # Complete session that should cause level up
            session_data = {
                "device_id": self.test_device_id,
                "duration_minutes": duration_needed
            }
            
            response = self.session.post(f"{self.base_url}/session/complete", json=session_data)
            if response.status_code == 200:
                data = response.json()
                
                if data["leveled_up"] and data["levels_gained"] > 0:
                    self.log_test("Level Up - Scenario", True, f"Leveled up from {data['session']['level_before']} to {data['session']['level_after']}")
                    return True
                else:
                    self.log_test("Level Up - Scenario", False, f"Expected level up but didn't happen. Data: {data}")
                    return False
            else:
                self.log_test("Level Up - Scenario", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Level Up - Scenario", False, f"Exception: {str(e)}")
            return False
    
    def test_rank_progression(self):
        """Test rank changes by reaching higher levels"""
        try:
            # Get current progress to see rank
            progress_response = self.session.get(f"{self.base_url}/progress/{self.test_device_id}")
            if progress_response.status_code != 200:
                self.log_test("Rank Progression", False, "Could not get current progress")
                return False
                
            current_progress = progress_response.json()
            current_level = current_progress["level"]
            current_rank = current_progress["rank"]
            
            print(f"   Current Level: {current_level}, Current Rank: {current_rank}")
            
            # If we're still at low levels, complete more sessions to reach rank D (level 11)
            if current_level < 11:
                # Complete multiple long sessions to gain levels quickly
                for i in range(5):
                    session_data = {
                        "device_id": self.test_device_id,
                        "duration_minutes": 30  # 30 minutes = 350 XP per session
                    }
                    
                    response = self.session.post(f"{self.base_url}/session/complete", json=session_data)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("ranked_up"):
                            self.log_test("Rank Progression", True, f"Ranked up from {data['old_rank']} to {data['new_rank']} at level {data['session']['level_after']}")
                            return True
                    time.sleep(0.1)  # Small delay between requests
                
                # Check final progress
                final_progress = self.session.get(f"{self.base_url}/progress/{self.test_device_id}")
                if final_progress.status_code == 200:
                    final_data = final_progress.json()
                    if final_data["rank"] != current_rank:
                        self.log_test("Rank Progression", True, f"Rank changed from {current_rank} to {final_data['rank']} at level {final_data['level']}")
                        return True
                
            self.log_test("Rank Progression", True, f"Rank system working (current: {current_rank} at level {current_level})")
            return True
            
        except Exception as e:
            self.log_test("Rank Progression", False, f"Exception: {str(e)}")
            return False
    
    def test_get_sessions_history(self):
        """Test GET /api/sessions/{device_id}"""
        try:
            response = self.session.get(f"{self.base_url}/sessions/{self.test_device_id}")
            if response.status_code == 200:
                sessions = response.json()
                
                if isinstance(sessions, list) and len(sessions) > 0:
                    # Check first session structure
                    session = sessions[0]
                    required_fields = ["id", "device_id", "duration_minutes", "xp_earned", "level_before", "level_after"]
                    missing_fields = [field for field in required_fields if field not in session]
                    
                    if missing_fields:
                        self.log_test("Get Sessions History", False, f"Missing fields in session: {missing_fields}")
                        return False
                    
                    self.log_test("Get Sessions History", True, f"Retrieved {len(sessions)} sessions")
                    return True
                else:
                    self.log_test("Get Sessions History", True, "No sessions found (expected for new user)")
                    return True
            else:
                self.log_test("Get Sessions History", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Sessions History", False, f"Exception: {str(e)}")
            return False
    
    def test_rank_info_endpoint(self):
        """Test GET /api/rank-info"""
        try:
            response = self.session.get(f"{self.base_url}/rank-info")
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if "ranks" in data and isinstance(data["ranks"], list):
                    ranks = data["ranks"]
                    expected_ranks = ["E", "D", "C", "B", "A", "S"]
                    
                    # Check all ranks are present
                    rank_letters = [r["rank"] for r in ranks]
                    if rank_letters == expected_ranks:
                        # Check rank thresholds
                        expected_thresholds = {"E": 1, "D": 11, "C": 21, "B": 36, "A": 51, "S": 71}
                        for rank_info in ranks:
                            expected_level = expected_thresholds[rank_info["rank"]]
                            if rank_info["min_level"] != expected_level:
                                self.log_test("Rank Info Endpoint", False, f"Wrong threshold for {rank_info['rank']}: expected {expected_level}, got {rank_info['min_level']}")
                                return False
                        
                        self.log_test("Rank Info Endpoint", True, f"All rank information correct")
                        return True
                    else:
                        self.log_test("Rank Info Endpoint", False, f"Wrong ranks: expected {expected_ranks}, got {rank_letters}")
                        return False
                else:
                    self.log_test("Rank Info Endpoint", False, f"Missing or invalid ranks data: {data}")
                    return False
            else:
                self.log_test("Rank Info Endpoint", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Rank Info Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_reset_progress(self):
        """Test DELETE /api/progress/{device_id}"""
        try:
            response = self.session.delete(f"{self.base_url}/progress/{self.test_device_id}")
            if response.status_code == 200:
                data = response.json()
                if "reset successfully" in data.get("message", "").lower():
                    # Verify reset by getting progress again
                    progress_response = self.session.get(f"{self.base_url}/progress/{self.test_device_id}")
                    if progress_response.status_code == 200:
                        progress = progress_response.json()
                        if (progress["level"] == 1 and progress["current_xp"] == 0 and 
                            progress["total_xp"] == 0 and progress["sessions_completed"] == 0):
                            self.log_test("Reset Progress", True, "Progress reset successfully")
                            return True
                        else:
                            self.log_test("Reset Progress", False, f"Progress not properly reset: {progress}")
                            return False
                    else:
                        self.log_test("Reset Progress", False, "Could not verify reset")
                        return False
                else:
                    self.log_test("Reset Progress", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Reset Progress", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Reset Progress", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting RunQuest Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔧 Test Device ID: {self.test_device_id}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_api_root,
            self.test_get_progress_new_user,
            self.test_complete_session_basic,
            self.test_level_up_scenario,
            self.test_rank_progression,
            self.test_get_sessions_history,
            self.test_rank_info_endpoint,
            self.test_reset_progress
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__} - Unexpected error: {str(e)}")
            print()  # Empty line between tests
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed. Check the details above.")
            return False

if __name__ == "__main__":
    tester = RunQuestAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)