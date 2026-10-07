import hashlib
from fastapi_users.password import PasswordHelper
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

password_hash = PasswordHash((
        Argon2Hasher(),
        ))
password_helper = PasswordHelper(password_hash)

def hash_password(raw_password):
    return password_helper.hash(raw_password)


def verify_password(raw_password, stored_hashed_password):
    verified, updated_hash = password_helper.verify_and_update(
        raw_password,
        stored_hashed_password
    )
    return verified, updated_hash


def hash_token(token: str):
    hashed_token = hashlib.sha256(token.encode()).hexdigest()
    return hashed_token


def verify_token(token: str, stored_token):
    return hash_token(token) == stored_token
