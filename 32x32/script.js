const colors = {
    "0x00": "#000000",
    "0x01": "#00FF00",
    "0x02": "#FF0000",
    "0x03": "#FFFF00",
    "0x04": "#0000FF",
    "0x05": "#FF00FF",
    "0x06": "#00FFFF",
    "0x07": "#FFFFFF"
};

let selectedColor = "0x00";
let isPainting = false;
let currentTool = "pencil"; // Herramienta seleccionada ("pencil" o "bucket")
let undoStack = [];
let redoStack = [];

// Crear la cuadrícula
const grid = document.getElementById('grid');
for (let i = 0; i < 1024; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.color = "0x00";

    // Evento para pintar una celda al hacer click
    cell.addEventListener('click', () => {
        if (currentTool === "pencil") {
            paintCell(cell);
        } else if (currentTool === "bucket") {
            fillConnectedCells(cell);
        }
    });

    // Eventos para pintar al arrastrar
    cell.addEventListener('mousedown', () => {
        if (currentTool === "pencil") {
            isPainting = true;
            paintCell(cell);
        }
    });
    cell.addEventListener('mouseover', () => {
        if (isPainting && currentTool === "pencil") {
            paintCell(cell);
        }
    });

    grid.appendChild(cell);
}

// Evento global para detener la pintura al soltar el botón del mouse
document.addEventListener('mouseup', () => {
    isPainting = false;
});

// Cambiar el color seleccionado
document.querySelectorAll('.color').forEach(colorDiv => {
    colorDiv.addEventListener('click', () => {
        selectedColor = colorDiv.dataset.color;
        document.getElementById('color-code').textContent = selectedColor;
    });
});

// Función para pintar una celda y guardar en el stack de deshacer
function paintCell(cell) {
    const prevColor = cell.dataset.color;
    const currentColor = selectedColor;

    // Solo guardamos en undoStack si el color cambia
    if (prevColor !== currentColor) {
        undoStack.push({ cell, prevColor, currentColor });
        redoStack = []; // Borrar el stack de rehacer al pintar
    }

    cell.style.backgroundColor = colors[selectedColor];
    cell.dataset.color = selectedColor;
}

// Herramienta de balde
document.getElementById('bucket-tool').addEventListener('click', () => {
    currentTool = "bucket"; // Cambiar a la herramienta de balde
});

// Herramienta de lápiz
document.getElementById('pencil-tool').addEventListener('click', () => {
    currentTool = "pencil"; // Cambiar a la herramienta de lápiz
});

// Función de relleno por inundación
function fillConnectedCells(startCell) {
    const targetColor = startCell.dataset.color;
    if (targetColor === selectedColor) return;

    const cellsToFill = [startCell];
    const visited = new Set();

    while (cellsToFill.length > 0) {
        const currentCell = cellsToFill.pop();
        if (visited.has(currentCell)) continue;
        visited.add(currentCell);

        const prevColor = currentCell.dataset.color;
        paintCell(currentCell); // Pintar la celda

        const neighbors = getAdjacentCells(currentCell);
        neighbors.forEach(neighbor => {
            if (neighbor.dataset.color === targetColor && !visited.has(neighbor)) {
                cellsToFill.push(neighbor);
            }
        });
    }
}

// Función para obtener celdas adyacentes
function getAdjacentCells(cell) {
    const cells = Array.from(document.getElementsByClassName('cell'));
    const index = cells.indexOf(cell);
    const adjacentIndices = [];

    if (index - 32 >= 0) adjacentIndices.push(index - 32);
    if (index + 32 < 1024) adjacentIndices.push(index + 32);
    if (index % 32 !== 0) adjacentIndices.push(index - 1);
    if (index % 32 !== 31) adjacentIndices.push(index + 1);

    return adjacentIndices.map(i => cells[i]);
}

// Función para deshacer
function undo() {
    if (undoStack.length > 0) {
        const { cell, prevColor, currentColor } = undoStack.pop();
        redoStack.push({ cell, prevColor: currentColor, currentColor: prevColor });

        cell.style.backgroundColor = colors[prevColor];
        cell.dataset.color = prevColor;
    }
}

// Función para rehacer
function redo() {
    if (redoStack.length > 0) {
        const { cell, prevColor, currentColor } = redoStack.pop();
        undoStack.push({ cell, prevColor, currentColor });

        cell.style.backgroundColor = colors[currentColor];
        cell.dataset.color = currentColor;
    }
}

// Manejadores para Ctrl + Z (Deshacer) y Ctrl + Y (Rehacer)
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'z') {
        undo();
    } else if (event.ctrlKey && event.key === 'y') {
        redo();
    }
});

// Manejador de evento para cargar una imagen
document.getElementById('upload-image').addEventListener('change', handleImageUpload);

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;

            img.onload = function() {
                drawImageOnGrid(img);
            };
        };
        
        reader.readAsDataURL(file);
    } else {
        alert('Por favor, selecciona un archivo de imagen válido.');
    }
}

// Función para dibujar la imagen en la cuadrícula
function drawImageOnGrid(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Escalar la imagen para ajustarla a la cuadrícula 32x32
    canvas.width = 32;
    canvas.height = 32;
    ctx.drawImage(img, 0, 0, 32, 32);

    // Obtener el color de cada píxel y aplicarlo a la cuadrícula
    const cells = document.querySelectorAll('.cell');
    const imageData = ctx.getImageData(0, 0, 32, 32).data;

    cells.forEach((cell, index) => {
        const r = imageData[index * 4];
        const g = imageData[index * 4 + 1];
        const b = imageData[index * 4 + 2];
        
        const hexColor = rgbToHex(r, g, b);
        const colorKey = getClosestColor(hexColor);
        cell.style.backgroundColor = colors[colorKey];
        cell.dataset.color = colorKey;
    });

    // Limpiar el redoStack después de cargar la imagen
    redoStack = [];
}

// Función para convertir RGB a formato hexadecimal
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}

// Función para encontrar el color más cercano de la paleta
function getClosestColor(hexColor) {
    const diff = (color1, color2) => {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);

        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);

        return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    };

    let closestColor = "0x00";
    let minDiff = Infinity;

    Object.keys(colors).forEach(key => {
        const color = colors[key];
        const currentDiff = diff(hexColor, color);
        if (currentDiff < minDiff) {
            minDiff = currentDiff;
            closestColor = key;
        }
    });

    return closestColor;
}

// Función de Importar código
document.getElementById('import-code').addEventListener('click', importCode);

function importCode() {
    // Lógica de importación, por ejemplo, recorriendo las celdas y cambiando sus colores
    const cells = document.querySelectorAll('.cell');
    Swal.fire({
        title: 'Importar código',
        html: '<textarea id="import-input" style="width: 100%; height: 100px;"></textarea>',
        showCancelButton: true,
        confirmButtonText: 'Importar',
        preConfirm: () => {
            const inputValue = document.getElementById('import-input').value.trim();
            const colorsArray = inputValue.split(',');

            cells.forEach((cell, index) => {
                if (colorsArray[index]) {
                    const color = colorsArray[index];
                    cell.style.backgroundColor = colors[color];
                    cell.dataset.color = color;
                }
            });

            // Crear el formato .db y copiar al portapapeles
            const dbFormat = colorsArray.map(color => `0x${color}`).join(', ');
            const dbString = `.db ${dbFormat}`;
            navigator.clipboard.writeText(dbString).then(() => {
                Swal.fire({
                    title: 'Código copiado!',
                    text: 'El código ha sido copiado al portapapeles en formato .db.',
                    icon: 'success'
                });
            }).catch((error) => {
                Swal.fire({
                    title: 'Error',
                    text: 'Hubo un problema al copiar al portapapeles.',
                    icon: 'error'
                });
            });
        }
    });
}

// Función para exportar el código
document.getElementById('export-code').addEventListener('click', exportCode);

function exportCode() {
    let code = "";
    document.querySelectorAll('.cell').forEach(cell => {
        code += cell.dataset.color + ",";
    });
    code = code.slice(0, -1); // Eliminar la última coma

    // Crear el formato .db y copiar al portapapeles
    const dbFormat = code.split(',').map(color => `0x${color}`).join(', ');
    const dbString = `.db ${dbFormat}`;
    navigator.clipboard.writeText(dbString).then(() => {
        Swal.fire({
            title: 'Código copiado!',
            text: 'El código ha sido copiado al portapapeles en formato .db.',
            icon: 'success'
        });
    }).catch((error) => {
        Swal.fire({
            title: 'Error',
            text: 'Hubo un problema al copiar al portapapeles.',
            icon: 'error'
        });
    });
}

const letters = {
    'A': [
        "010",
        "101",
        "111",
        "101",
        "101"
    ],
    'B': [
        "1110",
        "1001",
        "1110",
        "1001",
        "1110"
    ],
    'C': [
        "111",
        "100",
        "100",
        "100",
        "111"
    ],
    'D': [
        "1110",
        "1001",
        "1001",
        "1001",
        "1110"
    ],
    'E': [
        "111",
        "100",
        "111",
        "100",
        "111"
    ],
    'F': [
        "111",
        "100",
        "111",
        "100",
        "100"
    ],
    'G': [
        "011",
        "100",
        "100",
        "101",
        "011"
    ],
    'H': [
        "101",
        "101",
        "111",
        "101",
        "101"
    ],
    'I': [
        "111",
        "010",
        "010",
        "010",
        "111"
    ],
    'J': [
        "011",
        "001",
        "001",
        "101",
        "111"
    ],
    'K': [
        "1001",
        "1010",
        "1100",
        "1010",
        "1001"
    ],
    'L': [
        "100",
        "100",
        "100",
        "100",
        "111"
    ],
    'M': [
        "10001",
        "11011",
        "10101",
        "10001",
        "10001"
    ],
    'N': [
        "1001",
        "1101",
        "1011",
        "1001",
        "1001"
    ],
    'O': [
        "111",
        "101",
        "101",
        "101",
        "111"
    ],
    'P': [
        "110",
        "101",
        "110",
        "100",
        "100"
    ],
    'Q': [
        "0110",
        "1001",
        "1001",
        "1001",
        "0111"
    ],
    'R': [
        "111",
        "101",
        "111",
        "110",
        "101"
    ],
    'S': [
        "111",
        "100",
        "111",
        "001",
        "111"
    ],
    'T': [
        "11111",
        "00100",
        "00100",
        "00100",
        "00100"
    ],
    'U': [
        "1001",
        "1001",
        "1001",
        "1001",
        "0111"
    ],
    'V': [
        "1001",
        "1001",
        "1001",
        "0101",
        "0010"
    ],
    'W': [
        "1001",
        "1001",
        "1011",
        "1101",
        "1001"
    ],
    'X': [
        "1001",
        "0101",
        "0010",
        "0101",
        "1001"
    ],
    'Y': [
        "1001",
        "0101",
        "0010",
        "0010",
        "0010"
    ],
    'Z': [
        "1111",
        "0001",
        "0010",
        "0100",
        "1111"
    ]
};

function writeTextToGrid(text) {
    clearGrid();
    let startX = 0;
    let startY = 0;

    text.split(' ').forEach((word) => {
        const wordPattern = word.split('').map(char => letters[char.toUpperCase()]).filter(Boolean);
        let wordWidth = wordPattern.reduce((acc, pattern) => acc + pattern[0].length + 1, -1); // -1 for the space

        if (startX + wordWidth > 32) { // If the word doesn't fit in the line
            startX = 0; // Reset X position
            startY += 6; // Move to the next line
        }

        wordPattern.forEach((pattern) => {
            drawLetterOnGrid(pattern, startX, startY);
            startX += pattern[0].length + 1; // Move to the next position
        });

        startX += 1; // Add space between words
    });
}

// Función para dibujar una letra en la cuadrícula
function drawLetterOnGrid(pattern, startX, startY) {
    const cells = Array.from(document.getElementsByClassName('cell'));

    pattern.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            if (row[x] === '1') {
                const cellIndex = (startY + y) * 32 + (startX + x);
                const cell = cells[cellIndex];
                if (cell) { // Check if the cell exists
                    cell.style.backgroundColor = colors[selectedColor];
                    cell.dataset.color = selectedColor;
                }
            }
        }
    });
}

// Limpiar la cuadrícula
function clearGrid() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.backgroundColor = colors["0x00"];
        cell.dataset.color = "0x00";
    });
}

// Agregar evento para el botón de escritura de texto
document.getElementById('write-text').addEventListener('click', () => {
    const text = document.getElementById('text-input').value;
    writeTextToGrid(text);
});

