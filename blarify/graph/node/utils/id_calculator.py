from hashlib import md5


class IdCalculator:
    @staticmethod
    def generate_hashed_file_id(environment: str, pr_id: str, path: str) -> str:
        return IdCalculator.hash_id((IdCalculator.generate_file_id(environment, pr_id, path)))

    @staticmethod
    def hash_id(id: str) -> str:
        return md5(id.encode()).hexdigest()

    @staticmethod
    def generate_file_id(environment: str, pr_id: str, path: str) -> str:
        path_with_removed_first_slash = path[1:] if path.startswith("/") else path
        return f"/{environment}/{pr_id}/{path_with_removed_first_slash}"
