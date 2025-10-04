from flask import Flask, render_template

app = Flask(__name__)

# Ruta principal que muestra el dashboard
@app.route('/')
def dashboard():
    return render_template('index.html')

# NUEVA RUTA para la página de resultados
@app.route('/results')
def results():
    return render_template('results.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000)