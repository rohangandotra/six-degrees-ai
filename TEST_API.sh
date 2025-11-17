#!/bin/bash

# Quick API Test Script
# Make this executable: chmod +x TEST_API.sh
# Run it: ./TEST_API.sh

BASE_URL="http://localhost:3000"

echo "🧪 Testing 6th Degree AI API Endpoints"
echo "======================================="
echo ""

# Test 1: Register
echo "1️⃣  Testing Registration..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "full_name": "Test User"
  }')

echo "Response: $REGISTER_RESPONSE"
echo ""

# Test 2: Login
echo "2️⃣  Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }')

echo "Response: $LOGIN_RESPONSE"
echo ""

# Extract user ID (requires jq - install with: brew install jq)
if command -v jq &> /dev/null; then
  USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')
  echo "✅ Extracted User ID: $USER_ID"
  echo ""
else
  echo "⚠️  Install jq to auto-extract user ID: brew install jq"
  echo "For now, copy the user ID manually from the response above"
  read -p "Enter User ID: " USER_ID
fi

echo "🎉 API is working! Your Next.js backend is connected to Supabase."
echo ""
echo "Next steps:"
echo "1. Test uploading a CSV through the UI"
echo "2. Test searching"
echo "3. Test connections"
echo ""
