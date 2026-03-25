from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import json
import pickle

app = Flask(__name__)
CORS(app)

# ── Load Plant Model ──────────────────────────────────────────
plant_model = tf.keras.models.load_model('plant_model_fewshot.keras')
with open('plant_labels.json', 'r') as f:
    plant_class_labels = json.load(f)
plant_classes = list(plant_class_labels.values())
print("Plant model loaded!")

# ── Load Animal Models ────────────────────────────────────────
animal_model    = tf.keras.models.load_model('animal_EfficientNetV2S_finetuned_final.keras')
animal_backbone = tf.keras.models.load_model('animal_model_fewshot_backbone.keras')

with open('animal_labels.json', 'r') as f:
    animal_class_labels = json.load(f)
animal_classes = [animal_class_labels[str(i)] for i in range(len(animal_class_labels))]

with open('OryxEye_base_prototypes.pkl', 'rb') as f:
    base_prototypes = pickle.load(f)
with open('OryxEye_cartoon_prototypes.pkl', 'rb') as f:
    cartoon_prototypes = pickle.load(f)

print("Animal models loaded!")

# ── Helper: preprocess image ──────────────────────────────────
def preprocess(file_bytes, size=224):
    img = Image.open(io.BytesIO(file_bytes)).convert('RGB').resize((size, size))
    return np.expand_dims(np.array(img), axis=0)

# ── Helper: is image cartoon? ────────────────────────────────
def is_cartoon(img_array):
    img = img_array[0].astype(np.uint8)
    pil_img = Image.fromarray(img)
    unique_colors = len(set(pil_img.getdata()))
    return unique_colors < 50000

# ── Helper: prototypical animal prediction ───────────────────
def predict_animal_fewshot(img_array):
    features = animal_backbone.predict(img_array, verbose=0)
    scores = {}
    for cls in base_prototypes:
        base    = np.array(base_prototypes[cls]).flatten()
        cartoon = np.array(cartoon_prototypes[cls]).flatten() if cls in cartoon_prototypes else base
        proto   = (base + cartoon) / 2
        feat    = features.flatten()
        similarity = np.dot(feat, proto) / (np.linalg.norm(feat) * np.linalg.norm(proto) + 1e-8)
        scores[cls] = float(similarity)
    # Softmax over ALL classes for meaningful confidence scores
    all_names  = list(scores.keys())
    all_scores = np.array(list(scores.values()))
    exp_scores = np.exp(all_scores - all_scores.max())
    softmax    = exp_scores / exp_scores.sum()

    top3_idx = np.argsort(softmax)[::-1][:3]
    return [{"name": all_names[i].capitalize(), "confidence": round(float(softmax[i]) * 100, 1)} for i in top3_idx]

# ── Helper: standard animal prediction ───────────────────────
def predict_animal_standard(img_array):
    preds = animal_model.predict(img_array, verbose=0)[0]
    top3  = preds.argsort()[-3:][::-1]
    return [{"name": animal_classes[i].capitalize(), "confidence": round(float(preds[i]) * 100, 1)} for i in top3]

# ── Plant endpoint ────────────────────────────────────────────
@app.route('/classify/plant', methods=['POST'])
def classify_plant():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    img_array = preprocess(request.files['image'].read())
    preds = plant_model.predict(img_array, verbose=0)[0]
    top3  = preds.argsort()[-3:][::-1]
    results = [{"name": plant_classes[i].capitalize(), "confidence": round(float(preds[i]) * 100, 1)} for i in top3]
    return jsonify({"type": "plant", "results": results})

# ── Animal endpoint ───────────────────────────────────────────
@app.route('/classify/animal', methods=['POST'])
def classify_animal():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    file_bytes = request.files['image'].read()
    img_array  = preprocess(file_bytes, size=384)
    if is_cartoon(img_array):
        results = predict_animal_fewshot(img_array)
    else:
        results = predict_animal_standard(img_array)
    return jsonify({"type": "animal", "results": results})

# ── Auto classify (plant vs animal) ──────────────────────────
@app.route('/classify', methods=['POST'])
def classify():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file_bytes = request.files['image'].read()
    img_224 = preprocess(file_bytes, size=224)
    img_384 = preprocess(file_bytes, size=384)

    # Plant prediction first
    plant_preds = plant_model.predict(img_224, verbose=0)[0]
    plant_conf  = float(plant_preds.max()) * 100

    if plant_conf >= 70.0:
        plant_top3    = plant_preds.argsort()[-3:][::-1]
        plant_results = [{"name": plant_classes[i].capitalize(), "confidence": round(float(plant_preds[i]) * 100, 1)} for i in plant_top3]
        return jsonify({"type": "plant", "results": plant_results})

    # Plant not confident — try animal
    cartoon = is_cartoon(img_224)
    if cartoon:
        animal_results = predict_animal_fewshot(img_384)
    else:
        animal_results = predict_animal_standard(img_384)

    # If animal confidence is also low → unknown
    # Different thresholds: few-shot scores are tighter (normalized top-3)
    print(f"Top animal: {animal_results[0]['name']} — {animal_results[0]['confidence']}%")
    print(f"Plant conf: {plant_conf}%")
    min_confidence = 38.0 if cartoon else 35.0

    if animal_results[0]["confidence"] < min_confidence:
        return jsonify({
            "type": "unknown",
            "message": "Hmm, I'm not sure what this is! Try uploading a clearer photo of a plant or animal 🌿🐾"
        })

    return jsonify({"type": "animal", "results": animal_results})

# ── Health check ──────────────────────────────────────────────
@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "OryxEye Flask API running", "models": ["plant", "animal"]})

if __name__ == '__main__':
    app.run(port=5001)