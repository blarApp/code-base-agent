class FormatVerifier:
    @staticmethod
    def is_path_uri(path) -> bool:
        return path.startswith("file://")
