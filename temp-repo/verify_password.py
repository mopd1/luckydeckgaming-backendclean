import bcrypt

def verify_password(entered_password, stored_hash):
    # Convert the stored hash and entered password to bytes
    entered_password_bytes = entered_password.encode('utf-8')
    stored_hash_bytes = stored_hash.encode('utf-8')

    # Use bcrypt to check if the entered password matches the stored hash
    return bcrypt.checkpw(entered_password_bytes, stored_hash_bytes)

if __name__ == "__main__":
    # Replace this with the actual hashed password from your database
    stored_hash = '$2b$12$IL7/93dZIORaXb1d/8gPUeH2ztBIveD2RZUEPLu5cDBUJ7V6s.1Y2'

    # The password you want to verify
    entered_password = 'testpassword'

    if verify_password(entered_password, stored_hash):
        print("Password verification successful: Credentials are valid.")
    else:
        print("Password verification failed: Invalid credentials.")
