class ContextTracker:
    def __init__(self, symbols):
        self.symbols = symbols
        self.contexts = self._initialize_contexts()

    def _initialize_contexts(self):
        """Create a list of contexts with their line ranges."""
        contexts = []
        for symbol in self.symbols:
            line_start = symbol["location"]["range"]["start"]["line"]
            line_end = symbol["location"]["range"]["end"]["line"]
            container_name = symbol["containerName"]
            contexts.append((line_start, line_end, container_name))
        return contexts

    def get_contexts_for_line(self, line):
        """Return an ordered list of contexts that contain the specified line."""
        return [
            container for start, end, container in self.contexts if start <= line <= end
        ]
