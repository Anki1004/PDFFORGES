const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { exec } = require('child_process');
const pdfParse = require('pdf-parse');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- TOOL 1: UNBREAKABLE PROTECT (AES-256) ---
app.post('/api/protect', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).send("No file uploaded");
        const { password } = req.body;
        const inputPath = req.file.path;
        const outputPath = path.join('uploads', `secure_${req.file.originalname}`);

        const qpdfCommand = `qpdf --encrypt ${password} ${password} 256 -- "${inputPath}" "${outputPath}"`;

        exec(qpdfCommand, (error) => {
            if (error) return res.status(500).send("Security Engine Failure");
            const protectedBuffer = fs.readFileSync(outputPath);
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
            res.contentType("application/pdf");
            res.send(protectedBuffer);
            console.log("✅ UNBREAKABLE LOCK APPLIED!");
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- TOOL 2: PDF TO WORD ---
app.post('/api/pdf-to-word', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("No file uploaded");
        const dataBuffer = fs.readFileSync(req.file.path);
        
        // 1. Extract text
        const data = await pdfParse(dataBuffer);
        
        // 2. Build Word Document
        const doc = new Document({
            sections: [{
                children: [new Paragraph({ children: [new TextRun(data.text)] })],
            }],
        });

        // 3. Generate Buffer
        const buffer = await Packer.toBuffer(doc);
        fs.unlinkSync(req.file.path);

        res.setHeader('Content-Disposition', 'attachment; filename=converted.docx');
        res.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
        console.log("✅ PDF to Word conversion successful!");
    } catch (err) {
        res.status(500).send("Conversion failed: " + err.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 PDFForge running at http://localhost:${PORT}`));