import salesData from './combined_sales_data.json' assert { type: 'json' };

let salesChart;

// Define sizes
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

// Function to assign colors
function getColor(name) {
    const colorMap = {
        'Чорний': '#000000',
        'Білий': '#E0E0E0', // Changed from #FFFFFF to avoid blending with background
        'Ніжно-рожевий': '#FFC1CC',
        'Бежевий': '#F5F5DC',
        'Олива': '#808000',
        'Сірий Грі': '#808080',
        'Сірий': '#808080',
        'Хакі': '#C3B091',
        'Койот': '#8B6F47',
        'Інший Колір': '#FF00FF',
        'XS': '#FF6347',
        'S': '#4682B4',
        'M': '#32CD32',
        'L': '#FFD700',
        'XL': '#6A5ACD',
        'XXL': '#FF4500',
        '3XL': '#9ACD32'
    };
    return colorMap[name] || '#000000';
}

// Function to calculate total sales for a dataset
function calculateTotalSales(data) {
    return data.reduce((sum, value) => sum + value, 0);
}

// Function to update total sales display
function updateTotalSales(datasets) {
    const totalSalesDiv = document.getElementById('totalSales');
    let html = '<h3>Загальні суми продажів:</h3><ul>';
    datasets.forEach(dataset => {
        const total = calculateTotalSales(dataset.data);
        const label = dataset.label.split(' (Загалом:')[0]; // Remove total from label if present
        html += `<li><span class="label">${label}</span><span class="value">${total}</span></li>`;
    });
    html += '</ul>';
    totalSalesDiv.innerHTML = html;
}

// Function to get colors for a product
function getProductColors(productData) {
    const colorSet = new Set();
    productData.months.forEach(month => {
        Object.keys(month.colors).forEach(color => colorSet.add(color));
    });
    return Array.from(colorSet);
}

// Function to update product dropdown
function updateProductSelect() {
    const productSelect = document.getElementById('productSelect');
    productSelect.innerHTML = '';
    if (!salesData.products || salesData.products.length === 0) {
        productSelect.innerHTML = '<option value="">Немає продуктів</option>';
        document.getElementById('totalSales').innerHTML = '<p style="color: red;">Помилка: Немає продуктів у combined_sales_data.json</p>';
        return;
    }
    salesData.products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.name;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });
}

// Function to update chart type dropdown
function updateChartTypes() {
    const productSelect = document.getElementById('productSelect').value;
    const chartTypeSelect = document.getElementById('chartType');
    const productData = salesData.products.find(p => p.name === productSelect);
    chartTypeSelect.innerHTML = '<option value="byColor">Продажі за кольорами</option>';
    if (!productData) return;

    const colors = getProductColors(productData);
    colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = `Розміри для ${color}`;
        chartTypeSelect.appendChild(option);
    });
}

// Function to update chart based on selection
function updateChart() {
    const productSelect = document.getElementById('productSelect').value;
    const chartType = document.getElementById('chartType').value;
    const chartTitle = document.getElementById('chartTitle');

    // Find selected product data
    const productData = salesData.products.find(p => p.name === productSelect);
    if (!productData) {
        chartTitle.textContent = 'Дані недоступні';
        document.getElementById('totalSales').innerHTML = '<p style="color: red;">Помилка: Вибраний продукт не знайдено</p>';
        return;
    }

    const colors = getProductColors(productData);
    const months = productData.months.map(m => `${m.month} ${m.year}`);

    let datasets = [];
    let titleText = '';

    if (chartType === 'byColor') {
        // Sales by color
        datasets = colors.map(color => {
            const data = productData.months.map(month => {
                return month.colors[color] ? month.colors[color].reduce((sum, item) => sum + item.quantity, 0) : 0;
            });
            return {
                label: color,
                data: data,
                backgroundColor: getColor(color),
                borderColor: getColor(color),
                borderWidth: 1
            };
        });
        titleText = `Продажі за кольором для ${productSelect} по місяцях`;
    } else {
        // Sales by size for selected color
        datasets = sizes.map(size => {
            const data = productData.months.map(month => {
                const colorData = month.colors[chartType];
                const item = colorData ? colorData.find(i => i.size === size) : null;
                return item ? item.quantity : 0;
            });
            return {
                label: size,
                data: data,
                backgroundColor: getColor(size),
                borderColor: getColor(size),
                borderWidth: 1
            };
        });
        titleText = `Продажі за розмірами для кольору ${chartType} (${productSelect}) по місяцях`;
    }

    // Update total sales display
    updateTotalSales(datasets);

    // Destroy previous chart if exists
    if (salesChart) {
        salesChart.destroy();
    }

    // Update chart title
    chartTitle.textContent = titleText;

    // Create new chart
    salesChart = new Chart(document.getElementById('salesChart'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: datasets
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: titleText
                },
                legend: {
                    position: 'top'
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value, context) => {
                        return value > 0 ? value : '';
                    },
                    color: '#000',
                    font: {
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Місяць'
                    },
                    offset: true
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Кількість проданих одиниць'
                    }
                }
            },
            barPercentage: 1.0,
            categoryPercentage: 0.95,
            maxBarThickness: 100
        },
        plugins: [ChartDataLabels]
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!salesData.products || !Array.isArray(salesData.products)) {
            throw new Error('Неправильна структура JSON: відсутнє поле "products" або воно не є масивом');
        }
        updateProductSelect();
        updateChartTypes();
        updateChart();
    } catch (error) {
        console.error('Помилка ініціалізації даних:', error);
        document.getElementById('totalSales').innerHTML = `
            <p style="color: red;">
                Помилка завантаження combined_sales_data.json: ${error.message}. 
                Перевірте:
                <ul>
                    <li>Файл розташовано в тій же папці, що й index.html</li>
                    <li>Назва файлу точно "combined_sales_data.json"</li>
                    <li>Файл має правильний JSON-формат</li>
                    <li>Проєкт запущено через локальний сервер (наприклад, Live Server)</li>
                </ul>
            </p>`;
    }
});