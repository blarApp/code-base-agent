import os

import json5 as json


# usual case is {'@': './src'}
# Currently we assume that the config file is in the root and do not take into account the "./"
# TODO add better handling for the case when the config file is not in the root
class BaseAliasExtractor:
    def __init__(self):
        self.alias_extractors = {
            "package.json": self.extract_from_package_json,
            "tsconfig.json": self.extract_from_ts_js_config,
            "jsconfig.json": self.extract_from_ts_js_config,
        }

    def read_config(self, file_path):
        if file_path.endswith(".json"):
            with open(file_path, "r") as file:
                return json.load(file)
        else:
            with open(file_path, "r") as file:
                return file.read()

    def extract_from_package_json(self, file_path):
        data = self.read_config(file_path)
        return data.get("alias", {})

    def extract_from_ts_js_config(self, file_path):
        data = self.read_config(file_path)
        compiler_options = data.get("compilerOptions", {})
        return {k.replace("/*", ""): v[0].replace("/*", "") for k, v in compiler_options.get("paths", {}).items()}

    def extract_aliases(self, file_path):
        if os.path.exists(file_path):
            extractor = self.alias_extractors.get(os.path.basename(file_path))
            if extractor:
                try:
                    result = extractor(file_path)
                    return result
                except Exception as e:
                    print(f"Error extracting aliases from {file_path}: {e}")
                    return {}
        return {}
