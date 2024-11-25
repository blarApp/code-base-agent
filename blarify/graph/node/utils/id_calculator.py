from hashlib import md5


class IdCalculator:
    @staticmethod
    def hash_path_to_id(path: str) -> str:
        return md5(path.encode()).hexdigest()
