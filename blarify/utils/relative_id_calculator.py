class RelativeIdCalculator:
    @staticmethod
    def calculate(node_path: str) -> str:
        splitted = node_path.strip("/").split("/")
        if len(splitted) > 3:
            return "/" + "/".join(splitted[3:])
        return "/"
