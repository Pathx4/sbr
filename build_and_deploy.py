import os
import shutil
import subprocess

def run_deploy():
    # 1. Build frontend
    print("=== Step 1: Building frontend React Vite app ===")
    try:
        subprocess.run("npm run build", shell=True, cwd="frontend", check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error during frontend build: {e}")
        return

    # 2. Setup backend static directories
    print("=== Step 2: Organizing backend static assets ===")
    static_dir = "backend/static"
    word_dir = os.path.join(static_dir, "word")
    os.makedirs(word_dir, exist_ok=True)

    # If original Auto-Word files exist in the static root, move them to static/word/
    orig_files = ["app.js", "style.css", "index.html", "favicon.png", "favicon.ico"]
    for f in orig_files:
        src = os.path.join(static_dir, f)
        dst = os.path.join(word_dir, f)
        if os.path.exists(src):
            if os.path.exists(dst):
                os.remove(src)  # Clean up duplicate if already backed up
            else:
                shutil.move(src, dst)
                print(f"Moved original Auto-Word asset: {f} -> static/word/")

    # 3. Clean other files in static root (keep static/word/)
    print("=== Step 3: Cleaning old React assets from static root ===")
    for item in os.listdir(static_dir):
        item_path = os.path.join(static_dir, item)
        if item == "word":
            continue
        if os.path.isdir(item_path):
            shutil.rmtree(item_path)
        else:
            os.remove(item_path)

    # 4. Copy built files from frontend/dist to backend/static
    print("=== Step 4: Copying React build to backend static folder ===")
    dist_dir = "frontend/dist"
    for item in os.listdir(dist_dir):
        src = os.path.join(dist_dir, item)
        dst = os.path.join(static_dir, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)

    print("\n==============================================")
    print("Deployment Prep Done successfully!")
    print("You can now build and deploy the Docker container or deploy the backend to your hosting server!")
    print("==============================================")

if __name__ == "__main__":
    run_deploy()
