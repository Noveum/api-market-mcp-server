import os
import glob
import yaml
import json
import re


def is_valid_string(s):
    pattern = r'^[a-zA-Z0-9 _-]+$'
    return bool(re.match(pattern, s))


def update_summary(current_summary: str) -> str:
    """
    Prompts the user to manually enter a new summary based on the current summary.

    Parameters:
        current_summary (str): The summary text to be replaced.

    Returns:
        new_summary (str): The user-provided summary.
    """

    while True:
        print(f"\nOriginal summary: {current_summary}")
        new_summary = input("Enter a new summary under 54 characters: ").strip()

        if len(new_summary) < 55 and is_valid_string(new_summary):
            return new_summary
        else:
            print("Invalid summary. Please ensure it is under 54 characters and contains only alphanumeric characters, hyphens, and underscores.")


HTTP_METHODS = {"get", "post", "put", "delete", "patch", "head", "options", "trace"}

def update_method_summaries(paths_dict):
    """
    Iterate over all path entries and update the summary field in method definitions.
    """
    for path, methods in paths_dict.items():
        if isinstance(methods, dict):
            for method, operation in methods.items():
                if method.lower() in HTTP_METHODS and isinstance(operation, dict):
                    if "summary" in operation and isinstance(operation["summary"], str) and len(operation["summary"]) >= 55:
                        original_summary = operation["summary"]
                        new_summary = update_summary(current_summary=original_summary)
                        operation["summary"] = new_summary


file_patterns = ["*.yaml", "*.yml", "*.json"]
files = []
directory = r"modified_json_files"
for pattern in file_patterns:
    search_pattern = os.path.join(directory, pattern)
    files.extend(glob.glob(search_pattern))


for file in files:
    try:
        with open(file, 'r') as f:
            if file.endswith(".json"):
                data = json.load(f)
            else:
                data = yaml.safe_load(f)
    except Exception as e:
        print(f"Error reading {file}: {e}")
        continue

    if "paths" in data and isinstance(data["paths"], dict):
        update_method_summaries(data["paths"])

    try:
        with open(file, 'w') as f:
            if file.endswith(".json"):
                json.dump(data, f, indent=2)
            else:
                yaml.dump(data, f, sort_keys=False)
    except Exception as e:
        print(f"Error writing {file}: {e}")
