import json
import os
import re
from typing import List

#modifes api files

def get_json_files(directory: str) -> List[str]:
    # Pattern to match filenames like a-b-c.json, a-b.json, etc.
    pattern = re.compile(r'^([\w\-]+)\.json$')
    return [f for f in os.listdir(directory) if pattern.match(f)]

def replace_hyphens_in_paths(data):
    if 'paths' not in data:
        return data

    new_paths = {}
    for path, details in data['paths'].items():
        new_path = path.replace('-', '_')
        new_paths[new_path] = details

    data['paths'] = new_paths
    return data

def modify_paths(data: dict, prefix: str) -> dict:
    modified_paths = {f"{prefix}{path}": details for path, details in data['paths'].items()}
    data['paths'] = modified_paths
    modified_paths_keys = list(modified_paths.keys())
    for x in modified_paths_keys:
        print(x)
    return data

def resolve_references(data):
    components = data.get("components", {}).get("schemas", {})

    def _resolve(item):
        if isinstance(item, dict):
            if "$ref" in item:
                # Resolve $ref
                ref_path = item["$ref"].replace("#/components/schemas/", "")
                ref_obj = components.get(ref_path, {})
                if not ref_obj:
                    raise ValueError(f"Reference {item['$ref']} not found in components.")
                return _resolve(ref_obj)

            if "allOf" in item:
                # Resolve allOf
                combined_schema = {"type": "object", "properties": {}, "required": []}

                for subschema in item["allOf"]:
                    resolved_schema = _resolve(subschema)
                    combined_schema["properties"].update(resolved_schema.get("properties", {}))
                    combined_schema["required"].extend(resolved_schema.get("required", []))

                combined_schema["required"] = list(set(combined_schema["required"]))
                if "title" in item:
                    combined_schema["title"] = item["title"]

                return combined_schema

            # Recursively resolve nested schemas
            return {key: _resolve(value) for key, value in item.items()}

        if isinstance(item, list):
            return [_resolve(sub_item) for sub_item in item]

        return item

    return _resolve(data)

def process_files(directory: str):
    if not os.path.exists(directory):
        print(f"Error: Directory '{directory}' does not exist.")
        return
    
    files = get_json_files(directory)
    modified_files = []

    # Create a directory for modified files if it doesn't exist
    modified_dir = os.path.join('./', 'src/lib')
    os.makedirs(modified_dir, exist_ok=True)

    for file_name in files:
        file_path = os.path.join(directory, file_name)
        try:
            with open(file_path, 'r') as file:
                data = json.load(file)
        except FileNotFoundError:
            print(f"Error: File '{file_path}' not found.")
            continue
        except json.JSONDecodeError:
            print(f"Error: File '{file_path}' contains invalid JSON.")
            continue

        
        # Generate prefix from the filename, e.g., 'a-b-c.json' -> 'a/b_c/'
        file_name_no_ext = file_name.replace('.json', '')

        # Replace the first hyphen with a slash
        if '-' in file_name_no_ext:
            file_name_no_ext = file_name_no_ext.replace('-', '/', 1)

        prefix = file_name_no_ext.replace('-', '!')
        try:
            modified_data = modify_paths(data, prefix)
            modified_data = resolve_references(modified_data)
            modified_data = replace_hyphens_in_paths(modified_data)
            # Save modified data to modified_json_files directory
            output_file = os.path.relpath(os.path.join(modified_dir, f"modified_{file_name}"))
            with open(output_file, 'w') as file:
                json.dump(modified_data, file, indent=4)

            modified_files.append(output_file)
        except Exception as e:
            print(f"Error processing file '{file_name}': {str(e)}")
            continue

    # Write all modified file names to a text file in the current directory
    try:
        with open('./modified_files.txt', 'a') as file:
            modified_files = ['../' + x for x in modified_files]
            file.write('\n'.join(modified_files) + '\n')
    except Exception as e:
        print(f"Error writing to modified_files.txt: {str(e)}")

if __name__ == "__main__":
    directory = "../json_files"  # Specify your directory containing the JSON files
    process_files(directory)

