#!/usr/bin/env python3
import os
import zipfile

def create_project_zip():
    output_filename = "AI_Creator_Studio_Complete_Source.zip"
    public_dir = "public"
    os.makedirs(public_dir, exist_ok=True)
    
    public_target = os.path.join(public_dir, output_filename)
    root_target = output_filename

    exclude_dirs = {
        'node_modules',
        '.git',
        'dist',
        '.aistudio',
        '.cache',
        '__pycache__',
        '.data'
    }
    exclude_files = {
        output_filename,
        '.DS_Store'
    }

    print(f"Creating ZIP archive: {public_target} ...")
    
    with zipfile.ZipFile(public_target, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files or file.endswith('.log'):
                    continue
                
                file_path = os.path.join(root, file)
                # Normalize path for zip entry
                arcname = os.path.relpath(file_path, '.')
                if arcname.startswith('public/' + output_filename) or arcname == output_filename:
                    continue
                
                zipf.write(file_path, arcname)
                print(f"Added: {arcname}")

    # Copy to root as well
    with open(public_target, 'rb') as src, open(root_target, 'wb') as dst:
        dst.write(src.read())

    print("\n[SUCCESS] ZIP created successfully!")
    print(f"File size: {os.path.getsize(public_target) / (1024 * 1024):.2f} MB")
    
    # Verify contents
    with zipfile.ZipFile(public_target, 'r') as zipf:
        namelist = zipf.namelist()
        print(f"Total files archived: {len(namelist)}")
        print("Sample files:")
        for name in namelist[:15]:
            print(f" - {name}")

if __name__ == '__main__':
    create_project_zip()
