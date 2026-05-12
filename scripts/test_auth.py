import os
from sharepoint_client import authenticate

if __name__ == "__main__":
    print("Starting auth test...")
    token = authenticate()
    if token:
        print("AUTH SUCCESSFUL")
    else:
        print("AUTH FAILED")
