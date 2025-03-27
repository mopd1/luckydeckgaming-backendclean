import bcrypt

def generate_bcrypt_hash(password):
    # Generate a salt
    salt = bcrypt.gensalt()
    # Generate the bcrypt hash
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

if __name__ == "__main__":
    password = "testpassword"
    hashed_password = generate_bcrypt_hash(password)
    print("Hashed Password:", hashed_password)
