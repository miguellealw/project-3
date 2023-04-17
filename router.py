import socket
import sys

# Check if the port number is provided as a command line argument
if len(sys.argv) < 2:
    print("Please provide the port number as a command line argument")
    sys.exit()

# Get the port number from the command line argument
port = int(sys.argv[1])

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# Bind the socket to the specified port
sock.bind(('127.0.0.1', port))

print(f"Listening on port {port}...")

# Wait for incoming messages
while True:
    data, addr = sock.recvfrom(1024) # buffer size is 1024 bytes
    print(f"Received {len(data)} bytes from {addr}: {data}")
