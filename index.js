// app.js
const express = require('express');
const { PDFDocument, rgb } = require('pdf-lib');
const printer = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5555;

app.get('/print', async (req, res) => {
    try {
        // Cria um novo documento PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([500, 400]);
        const { width, height } = page.getSize();

        // Adiciona texto ao PDF
        page.drawText('Impressão direta com pdf-to-printer!', {
            x: 50,
            y: height - 50,
            size: 30,
            color: rgb(0, 0.53, 0.71),
        });

        // Salva o PDF em um buffer
        const pdfBytes = await pdfDoc.save();

        // Salva o PDF em um arquivo
        const pdfPath = path.join(__dirname, 'pdf/output.pdf');
        fs.writeFileSync(pdfPath, pdfBytes);

        // Imprime o PDF
        //await printer.print(pdfPath);
        await printer.print(pdfPath, { printer: 'Coibeu' });

        // Listar impressoras disponíveis
        const printers = await printer.getPrinters();
        console.log(printers);

        // Envia resposta ao cliente
        res.send('Documento enviado para impressão.');
    } catch (err) {

        console.error('Erro ao imprimir o documento:', err);
        res.status(500).send('Erro ao imprimir o documento.');

    }
});

app.listen(port, () => {

    // Retorno do resultado do servidor
    console.log(`Servidor de impressão rodando em http://localhost:${port}`);

});
