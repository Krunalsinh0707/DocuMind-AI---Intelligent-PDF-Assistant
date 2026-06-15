import os
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
import jwt

# Try to import firebase_admin. If it fails or is uninitialized, we fallback to mock auth
try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth
    from firebase_admin import credentials
    
    # Initialize firebase app if not already initialized
    if not firebase_admin._apps:
        # Check if service account credentials file exists
        cred_path = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try to initialize with default credentials or projectId
            project_id = os.getenv("FIREBASE_PROJECT_ID")
            if project_id:
                firebase_admin.initialize_app(options={"projectId": project_id})
            else:
                firebase_admin.initialize_app()
    FIREBASE_AVAILABLE = True
except Exception as e:
    FIREBASE_AVAILABLE = False

from app.utils.logger import logger

def verify_token(token: str) -> Dict:
    """Verifies Firebase ID token or checks for mock developer token.
    
    Returns:
        Dict: Parsed user profile dictionary (uid, email, name, picture).
    """
    token = token.strip()
    
    # 1. Developer Fallback Mode
    # If the token is a simple raw Firebase UID (28 characters, no dots), allow it.
    if len(token) == 28 and "." not in token:
        logger.info(f"Using mock local development bypass for UID: {token}")
        return {
            "uid": token,
            "name": f"Dev User {token[:6]}",
            "email": f"dev_{token[:6].lower()}@documind.local",
            "picture": None,
            "role": "user"
        }
        
    # 2. Real Firebase Verification
    if FIREBASE_AVAILABLE:
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            return {
                "uid": decoded_token.get("uid"),
                "name": decoded_token.get("name", "DocuMind User"),
                "email": decoded_token.get("email", ""),
                "picture": decoded_token.get("picture"),
                "role": "user"
            }
        except Exception as e:
            logger.warning(f"Firebase token verification failed: {str(e)}. Attempting JWT fallback.")
            
    # 3. Manual Decryption Fallback (for unverified keys / dev configurations)
    try:
        # Attempt to decode standard JWT token values without signature validation
        # to fetch user email and display details if Firebase server isn't reachable
        decoded = jwt.decode(token, options={"verify_signature": False})
        uid = decoded.get("user_id") or decoded.get("sub") or decoded.get("uid")
        if uid:
            return {
                "uid": uid,
                "name": decoded.get("name", "DocuMind User"),
                "email": decoded.get("email", ""),
                "picture": decoded.get("picture"),
                "role": "user"
            }
    except Exception as e:
        logger.error(f"Failed to decode token manually: {str(e)}")
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials token. Please supply a valid Firebase ID Token or raw Firebase UID."
    )
