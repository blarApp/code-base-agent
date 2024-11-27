from hashlib import md5


class IdCalculator:
    @staticmethod
    def generate_hashed_file_id(environment: str, pr_id: str, path: str) -> str:
        return md5(IdCalculator.generate_file_id(environment, pr_id, path).encode()).hexdigest()

    @staticmethod
    def generate_file_id(environment: str, pr_id: str, path: str) -> str:
        return f"/{environment}/{pr_id}/{path}"
