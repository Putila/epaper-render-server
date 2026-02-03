#!/bin/bash
# Test script for render-server

set -e

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

echo "=== Render Server Tests ==="
echo ""

# Test 1: Static page loads
echo -n "Test 1: Static page loads... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$RESPONSE" == "200" ]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL (HTTP $RESPONSE)"
    ((FAIL++))
fi

# Test 2: Static page contains expected content
echo -n "Test 2: Static page contains 'Hello World'... "
if curl -s "$BASE_URL/" | grep -q "Hello World"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 3: Screenshot endpoint returns 200
echo -n "Test 3: Screenshot endpoint returns HTTP 200... "
RESPONSE=$(curl -s -o /tmp/test-screenshot.png -w "%{http_code}" "$BASE_URL/screenshot")
if [ "$RESPONSE" == "200" ]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL (HTTP $RESPONSE)"
    ((FAIL++))
fi

# Test 4: Screenshot is valid PNG
echo -n "Test 4: Screenshot is valid PNG... "
if file /tmp/test-screenshot.png | grep -q "PNG image data"; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL"
    ((FAIL++))
fi

# Test 5: Screenshot has correct default dimensions (800x480)
echo -n "Test 5: Screenshot has default dimensions 800x480... "
DIMENSIONS=$(sips -g pixelWidth -g pixelHeight /tmp/test-screenshot.png 2>/dev/null | grep pixel | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
if [ "$DIMENSIONS" == "800x480" ]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL (got $DIMENSIONS)"
    ((FAIL++))
fi

# Test 6: Custom dimensions work
echo -n "Test 6: Custom dimensions (400x240) work... "
curl -s -o /tmp/test-custom.png "$BASE_URL/screenshot?width=400&height=240"
DIMENSIONS=$(sips -g pixelWidth -g pixelHeight /tmp/test-custom.png 2>/dev/null | grep pixel | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
if [ "$DIMENSIONS" == "400x240" ]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL (got $DIMENSIONS)"
    ((FAIL++))
fi

# Test 7: Content-Type is image/png
echo -n "Test 7: Screenshot Content-Type is image/png... "
CONTENT_TYPE=$(curl -s -I "$BASE_URL/screenshot" | grep -i "content-type" | cut -d' ' -f2 | tr -d '\r')
if [ "$CONTENT_TYPE" == "image/png" ]; then
    echo "PASS"
    ((PASS++))
else
    echo "FAIL (got $CONTENT_TYPE)"
    ((FAIL++))
fi

# Cleanup
rm -f /tmp/test-screenshot.png /tmp/test-custom.png

echo ""
echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "All tests passed!"
    exit 0
else
    echo "Some tests failed."
    exit 1
fi
