from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import json

app = Flask(__name__)
CORS(app)

# Load model + labels once
model = tf.keras.models.load_model('plant_model_fewshot.keras')
with open('plant_labels.json', 'r') as f:
    class_labels = json.load(f)
original_classes = list(class_labels.values())

print("Plant model loaded!")

@app.route('/classify', methods=['POST'])
def classify():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    img = Image.open(io.BytesIO(file.read())).convert('RGB').resize((224, 224))
    img_array = np.expand_dims(np.array(img), axis=0)
    preds = model.predict(img_array)[0]
    top3 = preds.argsort()[-3:][::-1]
    results = [{"name": original_classes[i].capitalize(), "confidence": round(float(preds[i]) * 100, 1)} for i in top3]
    return jsonify({"type": "plant", "results": results})

if __name__ == '__main__':
    app.run(port=5001)