# app.py
from flask import Flask, request, jsonify, render_template
import json
import os
import openai
# from llama_cpp import Llama
from dotenv import load_dotenv
load_dotenv()
openai.api_key = os.environ.get('API_KEY')

app = Flask(__name__)
# llm = Llama(model_path="mistral-7b-instruct-v0.1.Q4_K_M.gguf")

# Load prompts
with open('prompts/main_prompt.txt', 'r') as f:
    prompt = f.read()

with open('prompts/system_prompt.txt', 'r') as f:
    system_prompt = f.read()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/expand', methods=['POST'])
def query_gpt():
    req_data = request.get_json()
    obj = req_data['obj']
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        temperature=0.0,
        messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt.replace("<OBJECT>", obj)}
            ]
    )
    return jsonify(response.choices[0].message["content"])


# @app.route('/expand', methods=['POST'])
# def query_gpt():
#     req_data = request.get_json()
#     obj = req_data['obj']
#     output = llm(f'[INST] {prompt.replace("<OBJECT>", obj)} [/INST]', max_tokens=256, temperature=0, stop=["<s>", "\n"], echo=True)
#     return jsonify(output['choices'][0]['text'].split('[/INST]')[1].strip())


if __name__ == '__main__':
    app.run(debug=True)
    
