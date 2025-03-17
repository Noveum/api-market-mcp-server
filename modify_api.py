import json
import os
import re
from typing import List


def get_json_files(directory: str) -> List[str]:
    # Pattern to match filenames like a-b-c.json, a-b.json, etc.
    pattern = re.compile(r'^([\w\-]+)\.json$')
    return [f for f in os.listdir(directory) if pattern.match(f)]


def modify_paths(data: dict, prefix: str) -> dict:
    modified_paths = {f"{prefix}{path}": details for path, details in data['paths'].items()}
    data['paths'] = modified_paths
    return data

def resolve_references(data):
    components = data.get("components", {})

    def _resolve(item):
        if isinstance(item, dict):
            if "$ref" in item:
                ref_path = item["$ref"].replace("#/components/", "").split("/")
                ref_obj = components
                for part in ref_path:
                    ref_obj = ref_obj.get(part, {})
                if not ref_obj:
                    raise ValueError(f"Reference {item['$ref']} not found in components.")
                return _resolve(ref_obj)
            else:
                return {key: _resolve(value) for key, value in item.items()}
        elif isinstance(item, list):
            return [_resolve(sub_item) for sub_item in item]
        else:
            return item

    return _resolve(data)

def process_files(directory: str):
    files = get_json_files(directory)
    modified_files = []

    # Create a directory for modified files if it doesn't exist
    modified_dir = os.path.join('./', 'modified_json_files')
    os.makedirs(modified_dir, exist_ok=True)

    for file_name in files:
        file_path = os.path.join(directory, file_name)
        with open(file_path, 'r') as file:
            data = json.load(file)

        # Generate prefix from the filename, e.g., 'a-b-c.json' -> 'a/b/c/'
        prefix = '/'.join(file_name.replace('.json', '').split('-')) + '/'
        modified_data = modify_paths(data, prefix)
        modified_data = resolve_references(modified_data)
        # Save modified data to modified_json_files directory
        output_file = os.path.relpath(os.path.join(modified_dir, f"modified_{file_name}"))
        with open(output_file, 'w') as file:
            json.dump(modified_data, file, indent=4)

        modified_files.append(output_file)

    # Write all modified file names to a text file in the current directory
    with open('./modified_files.txt', 'w') as file:
        modified_files = ['../' + x for x in modified_files]
        file.write('\n'.join(modified_files))


if __name__ == "__main__":
    directory = "./json_files"  # Specify your directory containing the JSON files
    process_files(directory)

