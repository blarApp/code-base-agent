import re


class UnidiffParser:
    _MATCH_HUNK = r"@@ -\d+,\d+ \+(\d+),(\d+) @@"

    def _parse_hunks(diff: str) -> list[str]:
        """Extracts hunk metadata and corresponding bodies from the diff."""
        hunks = []
        for match in re.finditer(UnidiffParser._MATCH_HUNK, diff):
            start_line = int(match.group(1))
            hunk_body = diff[match.end() :].splitlines()
            hunks.append((start_line, hunk_body))
        return hunks

    def _extract_modified_lines_from_hunk(start_line: int, hunk_body: list[str]) -> list[int]:
        """Extracts modified line numbers from a single hunk."""
        modified_lines = []
        current_line = start_line

        for line in hunk_body:
            if line.startswith("-"):
                modified_lines.append(current_line)
            elif line.startswith("+"):
                modified_lines.append(current_line)
                current_line += 1
            elif line.startswith(" "):
                current_line += 1
            elif line == "":
                break
        return modified_lines

    def get_modified_lines(diff: str) -> list:
        """Main function to extract all modified line numbers from a diff."""
        modified_lines = []
        hunks = UnidiffParser._parse_hunks(diff)
        for start_line, hunk_body in hunks:
            modified_lines.extend(UnidiffParser._extract_modified_lines_from_hunk(start_line, hunk_body))
        return sorted(set(modified_lines))


if __name__ == "__main__":
    # Example usage
    diff_text = """
    @@ -98,8 +98,8 @@ async def receive(self, text_data=None, bytes_data=None):
            text_data_json = json.loads(text_data)
            if text_data_json["type"] == "blar_agent_message":
                if not self.is_agent_running:
    -                self.is_agent_running = True
    -                await self.blar_agent_message(text_data_json)
    +                self.is_agent_running = False
    +                await self.blar_agent_messager(text_data_json)
                else:
                    logger.info("Agent is already running.")
                    await self.send(text_data=json.dumps({"message": "Agent is already running."}))
    @@ -113,7 +113,7 @@ async def send_message_progress(self, event):
                return
            await self.send(text_data=json.dumps(message))
    
    -    async def blar_agent_message(self, event):
    +    async def blar_agent_messager(self, event):
            text_data_json = event.copy()
            text_data_json.pop("type")
    """

    print(UnidiffParser.get_modified_lines(diff_text))
