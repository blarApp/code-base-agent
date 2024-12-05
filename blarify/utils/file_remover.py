import os


class FileRemover:
    @staticmethod
    def soft_delete_file(file_path: str) -> None:
        os.rename(file_path, f"{file_path}.deleted")
