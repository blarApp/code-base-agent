import os


class FileRemover:
    @staticmethod
    def soft_delete_if_exists(root_path: str, file_name: str) -> None:
        file_path = os.path.join(root_path, file_name)
        if os.path.exists(file_path):
            FileRemover.soft_delete_file(file_path)

    @staticmethod
    def soft_delete_file(file_path: str) -> None:
        os.rename(file_path, f"{file_path}.deleted")
