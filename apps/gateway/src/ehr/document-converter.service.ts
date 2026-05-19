import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class DocumentConverterService {
  async convertToPdf(file: Express.Multer.File): Promise<Buffer> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ehr-'));
    const ext = file.originalname.split('.').pop() ?? 'docx';
    const inputPath = path.join(tmpDir, `${randomUUID()}.${ext}`);
    const outputPath = inputPath.replace(`.${ext}`, '.pdf');

    try {
      await fs.writeFile(inputPath, file.buffer);

      await execAsync(
        `libreoffice --headless --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`,
      );

      const pdfBuffer = await fs.readFile(outputPath);
      return pdfBuffer;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  isPdf(file: Express.Multer.File): boolean {
    return file.mimetype === 'application/pdf';
  }

  needsConversion(file: Express.Multer.File): boolean {
    return (
      file.mimetype === 'application/msword' ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }
}
