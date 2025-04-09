// Import OpenAI key
import { OPENAI_API_KEY } from './config.js';

document.addEventListener('DOMContentLoaded', function() {
    let seoDescriptionLength = 'short'; // Default to short descriptions
    // Get all UI elements
// Get button elements
const shoppingButton = document.getElementById('shoppingPath');
const seoButton = document.getElementById('seoPath');
const shortSEOButton = document.getElementById('shortSEO');
const longSEOButton = document.getElementById('longSEO');
const pathSelection = document.getElementById('pathSelection');
const seoLengthOptions = document.getElementById('seoLengthOptions');
const uploadSection = document.getElementById('uploadSection');
const uploadButton = document.getElementById('uploadButton'); 
const fileInput = document.getElementById('csvFile');
const fileInfo = document.getElementById('fileInfo');
const uploadStatus = document.getElementById('uploadStatus');
const previewArea = document.getElementById('previewArea');
const generateButton = document.getElementById('generateDescriptions');

// Shopping path click handler
shoppingButton.addEventListener('click', function() {
    // Create back button if it doesn't exist
    let backButton = document.createElement('button');
    backButton.id = 'backButton';
    backButton.className = 'back-button';
    backButton.textContent = 'Back to Options';
    
    // Add it to the left panel
    document.querySelector('.left-panel').insertBefore(backButton, document.querySelector('.left-panel').firstChild);

    // Add click handler to the back button
    backButton.addEventListener('click', function() {
        // Remove the back button
        backButton.remove();
        
        // Show/hide appropriate sections
        pathSelection.style.display = 'block';
        seoLengthOptions.style.display = 'none';
        uploadSection.style.display = 'block';
    });

    // Hide/show appropriate sections
    pathSelection.style.display = 'none';
    seoLengthOptions.style.display = 'none';
    uploadSection.style.display = 'block';
});

// SEO path click handler
seoButton.addEventListener('click', function() {
    // Create back button if it doesn't exist
    let backButton = document.createElement('button');
    backButton.id = 'backButton';
    backButton.className = 'back-button';
    backButton.textContent = 'Back to Options';
    
    // Add it to the left panel
    document.querySelector('.left-panel').insertBefore(backButton, document.querySelector('.left-panel').firstChild);
    
    // Add click handler to the back button
    backButton.addEventListener('click', function() {
        // Remove the back button
        backButton.remove();
        
        // Show/hide appropriate sections
        pathSelection.style.display = 'block';
        seoLengthOptions.style.display = 'none';
        uploadSection.style.display = 'block';
    });

    // Hide/show appropriate sections
    pathSelection.style.display = 'none';
    seoLengthOptions.style.display = 'block';
    uploadSection.style.display = 'none';
});

// Short SEO option click handler
shortSEOButton.addEventListener('click', function() {
    sessionStorage.setItem('seoLength', '200');
    seoLengthOptions.style.display = 'none';
    uploadSection.style.display = 'block';
});

// Long SEO option click handler
longSEOButton.addEventListener('click', function() {
    sessionStorage.setItem('seoLength', '1500');
    seoLengthOptions.style.display = 'none';
    uploadSection.style.display = 'block';
});
    // Handle back button with console log
    backButton.addEventListener('click', () => {
        console.log('Back button clicked');
        showPathSelection();
    });

function showUploadInterface(pathName) {
    pathSelection.style.display = 'none';
    uploadSection.style.display = 'block';
    backButton.style.display = 'block';
    selectedPathDisplay.textContent = `Selected Path: ${pathName}`;
    
    // Update info message based on path
    const infoSection = document.querySelector('.info-section');
    const shoppingMessage = '<h3>Shopping Feed Description Generator</h3>' +
        '<p>Creates Google Shopping optimized descriptions using:</p>' +
        '<p class="required-fields">' +
        '* Title<br>' +
        '* Description<br>' +
        '* Price<br>' +
        '* Brand</p>' +
        '<p class="note">Note: For Google Merchant Center uploads, you will need to add additional fields (id, link, availability, condition, image_link) before submitting to Google.</p>';

    const seoMessage = '<h3>SEO Product Description Generator</h3>' +
        '<p>Creates search-optimized product descriptions using:</p>' +
        '<p class="required-fields">' +
        '* Title<br>' +
        '* Description<br>' +
        '* Price<br>' +
        '* Brand</p>' +
        '<p class="note">Note: These descriptions are optimized for search visibility and can be used for your product pages or meta descriptions.</p>';

    infoSection.innerHTML = (pathName === 'Shopping Feed Optimization') ? shoppingMessage : seoMessage;
}

    function showPathSelection() {
        pathSelection.style.display = 'flex';
        uploadSection.style.display = 'none';
        backButton.style.display = 'none';
        selectedPathDisplay.textContent = '';
        // Clear any existing data
        previewArea.innerHTML = '';
        fileInput.value = '';
        fileInfo.textContent = '';
        uploadStatus.textContent = '';
    }

    // Check auth status when page loads
    checkAuthStatus();

    function checkAuthStatus() {
        chrome.storage.local.get(['authToken'], function(result) {
            if (result.authToken) {
                showPathSelection();
            }
        });
    }

    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            fileInfo.textContent = `Selected file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            uploadButton.disabled = false;
        }
    });

    // Handle preview button click
    uploadButton.addEventListener('click', async function() {
        const file = fileInput.files[0];
        if (!file) {
            uploadStatus.textContent = 'Please select a file first.';
            return;
        }

        uploadStatus.textContent = 'Reading file...';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const csvContent = e.target.result;
                const lines = csvContent.split('\n');
                const headers = lines[0].split(',').map(header => header.trim());
                
                // Validate headers
                if (!validateHeaders(headers).isValid) {
                    const validation = validateHeaders(headers);
                    let errorMessage = 'Missing required fields: ' + validation.missingRequired.join(', ');
                    
                    if (validation.unknownFields.length > 0) {
                        errorMessage += '\nUnknown fields: ' + validation.unknownFields.join(', ');
                    }

                    // Optional fields present (informational)
                    if (validation.presentOptional.length > 0) {
                        uploadStatus.textContent = errorMessage;
                        let infoMessage = 'Optional fields found: ' + validation.presentOptional.join(', ');
                        // Create and show info message below error
                        const infoDiv = document.createElement('div');
                        infoDiv.textContent = infoMessage;
                        infoDiv.style.color = 'blue';
                        uploadStatus.parentNode.insertBefore(infoDiv, uploadStatus.nextSibling);
                    } else {
                        uploadStatus.textContent = errorMessage;
                    }
                    return;
                }

                products = parseCSV(lines, headers);
                displayPreview(products, headers);
                uploadStatus.textContent = `Successfully loaded ${products.length} products`;
                
            } catch (error) {
                uploadStatus.textContent = 'Error processing file: ' + error.message;
            }
        };

        reader.onerror = function() {
            uploadStatus.textContent = 'Error reading file';
        };

        reader.readAsText(file);
    });

    // Generate descriptions button handler
    generateButton.addEventListener('click', async function() {
        try {
            console.log('Starting generation...');
            uploadStatus.textContent = 'Generating descriptions...';
            
            console.log('Products before loop:', products);
            const totalProducts = products.length;
            let processed = 0;
            
            if (!products || products.length === 0) {
                throw new Error('No products loaded');
            }
            
            for (const product of products) {
                console.log('Processing product:', product);
                uploadStatus.textContent = `Processing product ${processed + 1} of ${totalProducts}...`;
                product.generatedDescription = await generateProductDescription(product);
                processed++;
            }
            
            uploadStatus.textContent = 'Descriptions generated successfully!';
            displayGeneratedDescriptions(products);
            
        } catch (error) {
            console.error('Error details:', error);
            uploadStatus.textContent = 'Error generating descriptions: ' + error.message;
        }
    });

function validateHeaders(headers) {
    const requiredFields = [
        'title',
        'description',
        'price',
        'brand'
    ];
        const optionalFields = [
            'gtin',
            'mpn',
            'google_product_category',
            'product_type',
            'image_link',
            'additional_image_link',
            'color',
            'size',
            'material',
            'shipping',
            'gender',
            'age_group',
            'item_group_id',
            'custom_label_0',
            'custom_label_1',
            'custom_label_2',
            'custom_label_3',
            'custom_label_4'
        ];

        // Check for required fields
        const missingRequired = requiredFields.filter(field => 
            !headers.some(header => header.toLowerCase() === field.toLowerCase())
        );

        // Create validation result
        const validationResult = {
            isValid: missingRequired.length === 0,
            missingRequired: missingRequired,
            presentOptional: optionalFields.filter(field => 
                headers.some(header => header.toLowerCase() === field.toLowerCase())
            ),
            unknownFields: headers.filter(header => 
                !requiredFields.includes(header.toLowerCase()) && 
                !optionalFields.includes(header.toLowerCase())
            )
        };

        return validationResult;
    }

    function parseCSV(lines, headers) {
        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(value => value.trim());
            const product = {};
            
            headers.forEach((header, index) => {
                product[header] = values[index] || '';
            });
            
            products.push(product);
        }
        
        return products;
    }

    function displayPreview(products, headers) {
        previewArea.style.display = 'block';
        
        let html = '<table>';
        
        html += '<tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr>';
        
        products.forEach(product => {
            html += '<tr>';
            headers.forEach(header => {
                html += `<td>${product[header]}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</table>';
        previewArea.innerHTML = html;
        generateButton.style.display = 'block';
    }

function displayGeneratedDescriptions(products) {
    let html = '<h3>Generated Descriptions</h3><table>';
    
    html += `<tr>
        <th>Title</th>
        <th>Original Description</th>
        <th>Generated Description</th>
        <th>Character Count</th>
    </tr>`;
    
    products.forEach(product => {
        const description = (product.generatedDescription || 'Pending...').replace(/['"]+/g, '');
        const charCount = description !== 'Pending...' ? description.length : 0;
        
        html += `<tr>
            <td>${product.title}</td>
            <td>${product.description || 'No description'}</td>
            <td>${description}</td>
            <td>${charCount} chars</td>
        </tr>`;
    });
    
    html += '</table>';
    previewArea.innerHTML += html;
}

    // Validation function for descriptions
    function validateDescription(description, type) {
        const charLimit = type === 'shopping' ? 200 : 
            (seoDescriptionLength === 'short' ? 200 : 1500);
        
        if (description.length > charLimit) {
            return {
                isValid: false,
                message: `Description exceeds ${charLimit} character limit`,
                truncatedText: description.substring(0, charLimit)
            };
        }
        
        return {
            isValid: true,
            message: '',
            truncatedText: description
        };
    }

    async function generateProductDescription(product) {
        const prompts = {
            shopping: `Generate a product description optimized for Google Shopping ads:
                Product Title: ${product.title}
                Product Type: ${product.product_type || 'General'}
                Brand: ${product.brand}
                Price: ${product.price}

                Requirements:
                - Start with [Product Category]: [Product Name] by [Brand]
                - Include key product identifiers in first 160 characters
                - Focus on specifications and attributes
                - Include searchable features
                - Maximum 200 characters
                - No promotional language
                - Match search intent
                - Highlight key product features`,
            seo: seoDescriptionLength === 'short' ? 
                `Generate a concise SEO-optimized product description for search results:
                    Product Title: ${product.title}
                    Product Type: ${product.product_type || 'General'}
                    Brand: ${product.brand}
                    Price: ${product.price}

                    Requirements:
                    - STRICT maximum of 200 characters
                    - Include primary keyword in first sentence
                    - Focus on most compelling features and benefits
                    - Natural keyword integration
                    - Compelling search result snippet
                    - Must be under 200 characters for search display` :
                `Generate a comprehensive SEO-optimized product description:
                    Product Title: ${product.title}
                    Product Type: ${product.product_type || 'General'}
                    Brand: ${product.brand}
                    Price: ${product.price}

                    Requirements:
                    - Maximum 1500 characters
                    - Primary keyword in first paragraph
                    - Rich product details and specifications
                    - Natural keyword integration
                    - Include product benefits
                    - Focus on long-tail keywords
                    - Structured content format
                    - SEO-friendly formatting`
        };

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            "role": "system",
                            "content": selectedPath === 'shopping' ? 
                                "You are a Google Shopping feed optimizer." : 
                                "You are an SEO product feed content specialist."
                        },
                        {
                            "role": "user",
                            "content": prompts[selectedPath]
                        }
                    ],
                    max_tokens: selectedPath === 'shopping' ? 200 : 400,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            console.log('OpenAI Response:', data);
            
            if (!response.ok) {
                throw new Error(`API Error: ${data.error?.message || 'Unknown error'}`);
            }

            if (data.choices && data.choices[0]) {
                const generatedDescription = data.choices[0].message.content.trim();
                const validation = validateDescription(generatedDescription, selectedPath);
                
                if (!validation.isValid) {
                    console.log('Validation message:', validation.message);
                }
                
                return validation.truncatedText;
            } else {
                throw new Error('No description generated');
            }
        } catch (error) {
            console.error('Full error:', error);
            throw error;
        }
    }
});