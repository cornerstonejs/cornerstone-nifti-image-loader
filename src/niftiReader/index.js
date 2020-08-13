import nifti from 'nifti-reader-js';

const enhancedNiftiReader = nifti;
const NIFTI_FORMATS = [enhancedNiftiReader.NIFTI1, enhancedNiftiReader.NIFTI2];

/**
 * Current Nifti reader is an implementation on top of nifti-reader-js package.
 * At this file there will be any adaption to original reader.
 */

// from nifti standard extended content must be multiple of 16 bytes long.
// Considering 8 (valid size for esize and ecode) as the minimum necessary for a extended header content
const EXTENDED_HEADER_MIN_SIZE = 8;
const decorateNiftiReader = (niftiReader) => {

  /**
   * Reads the header data.
   * Originally from nifti-reader-js package implementation.
   * Every line comes from original package besides its ending where enhances it to read header of a nifti file with extended header information but given contains only header data (not header+extended header data).
   *
   * @param {ArrayBuffer} data
   */
  niftiReader.NIFTI1.prototype.readHeader = function (data) {
    const rawData = new DataView(data);
    let magicCookieVal = niftiReader.Utils.getIntAt(
        rawData,
        0,
        this.littleEndian
      ),
      ctr,
      ctrOut,
      ctrIn,
      index;

    if (magicCookieVal !== niftiReader.NIFTI1.MAGIC_COOKIE) {
      // try as little endian
      this.littleEndian = true;
      magicCookieVal = niftiReader.Utils.getIntAt(
        rawData,
        0,
        this.littleEndian
      );
    }

    if (magicCookieVal !== niftiReader.NIFTI1.MAGIC_COOKIE) {
      throw new Error('This does not appear to be a NIFTI file!');
    }

    this.dim_info = niftiReader.Utils.getByteAt(rawData, 39);

    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 40 + ctr * 2;
      this.dims[ctr] = niftiReader.Utils.getShortAt(
        rawData,
        index,
        this.littleEndian
      );
    }

    this.intent_p1 = niftiReader.Utils.getFloatAt(
      rawData,
      56,
      this.littleEndian
    );
    this.intent_p2 = niftiReader.Utils.getFloatAt(
      rawData,
      60,
      this.littleEndian
    );
    this.intent_p3 = niftiReader.Utils.getFloatAt(
      rawData,
      64,
      this.littleEndian
    );
    this.intent_code = niftiReader.Utils.getShortAt(
      rawData,
      68,
      this.littleEndian
    );

    this.datatypeCode = niftiReader.Utils.getShortAt(
      rawData,
      70,
      this.littleEndian
    );
    this.numBitsPerVoxel = niftiReader.Utils.getShortAt(
      rawData,
      72,
      this.littleEndian
    );

    this.slice_start = niftiReader.Utils.getShortAt(
      rawData,
      74,
      this.littleEndian
    );

    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 76 + ctr * 4;
      this.pixDims[ctr] = niftiReader.Utils.getFloatAt(
        rawData,
        index,
        this.littleEndian
      );
    }

    this.vox_offset = niftiReader.Utils.getFloatAt(
      rawData,
      108,
      this.littleEndian
    );

    this.scl_slope = niftiReader.Utils.getFloatAt(
      rawData,
      112,
      this.littleEndian
    );
    this.scl_inter = niftiReader.Utils.getFloatAt(
      rawData,
      116,
      this.littleEndian
    );

    this.slice_end = niftiReader.Utils.getShortAt(
      rawData,
      120,
      this.littleEndian
    );
    this.slice_code = niftiReader.Utils.getByteAt(rawData, 122);

    this.xyzt_units = niftiReader.Utils.getByteAt(rawData, 123);

    this.cal_max = niftiReader.Utils.getFloatAt(
      rawData,
      124,
      this.littleEndian
    );
    this.cal_min = niftiReader.Utils.getFloatAt(
      rawData,
      128,
      this.littleEndian
    );

    this.slice_duration = niftiReader.Utils.getFloatAt(
      rawData,
      132,
      this.littleEndian
    );
    this.toffset = niftiReader.Utils.getFloatAt(
      rawData,
      136,
      this.littleEndian
    );

    this.description = niftiReader.Utils.getStringAt(rawData, 148, 228);
    this.aux_file = niftiReader.Utils.getStringAt(rawData, 228, 252);

    this.qform_code = niftiReader.Utils.getShortAt(
      rawData,
      252,
      this.littleEndian
    );
    this.sform_code = niftiReader.Utils.getShortAt(
      rawData,
      254,
      this.littleEndian
    );

    this.quatern_b = niftiReader.Utils.getFloatAt(
      rawData,
      256,
      this.littleEndian
    );
    this.quatern_c = niftiReader.Utils.getFloatAt(
      rawData,
      260,
      this.littleEndian
    );
    this.quatern_d = niftiReader.Utils.getFloatAt(
      rawData,
      264,
      this.littleEndian
    );
    this.qoffset_x = niftiReader.Utils.getFloatAt(
      rawData,
      268,
      this.littleEndian
    );
    this.qoffset_y = niftiReader.Utils.getFloatAt(
      rawData,
      272,
      this.littleEndian
    );
    this.qoffset_z = niftiReader.Utils.getFloatAt(
      rawData,
      276,
      this.littleEndian
    );

    for (ctrOut = 0; ctrOut < 3; ctrOut += 1) {
      for (ctrIn = 0; ctrIn < 4; ctrIn += 1) {
        index = 280 + (ctrOut * 4 + ctrIn) * 4;
        this.affine[ctrOut][ctrIn] = niftiReader.Utils.getFloatAt(
          rawData,
          index,
          this.littleEndian
        );
      }
    }

    this.affine[3][0] = 0;
    this.affine[3][1] = 0;
    this.affine[3][2] = 0;
    this.affine[3][3] = 1;

    this.intent_name = niftiReader.Utils.getStringAt(rawData, 328, 344);
    this.magic = niftiReader.Utils.getStringAt(rawData, 344, 348);

    this.isHDR = this.magic === niftiReader.NIFTI1.MAGIC_NUMBER2;
    // original implementation adaption
    this.setExtendedHeader(rawData);
  };

  /**
   * Reads the header data.
   * Originally from nifti-reader-js package implementation.
   * Every line comes from original package besides its ending where enhances it to read header of a nifti file with extended header information but given contains only header data (not header+extended header data).
   *
   * @param {ArrayBuffer} data
   */
  niftiReader.NIFTI2.prototype.readHeader = function (data) {
    const rawData = new DataView(data);
    let magicCookieVal = niftiReader.Utils.getIntAt(
        rawData,
        0,
        this.littleEndian
      ),
      ctr,
      ctrOut,
      ctrIn,
      index;

    if (magicCookieVal !== niftiReader.NIFTI2.MAGIC_COOKIE) {
      // try as little endian
      this.littleEndian = true;
      magicCookieVal = niftiReader.Utils.getIntAt(
        rawData,
        0,
        this.littleEndian
      );
    }

    if (magicCookieVal !== niftiReader.NIFTI2.MAGIC_COOKIE) {
      throw new Error('This does not appear to be a NIFTI file!');
    }

    this.datatypeCode = niftiReader.Utils.getShortAt(
      rawData,
      12,
      this.littleEndian
    );
    this.numBitsPerVoxel = niftiReader.Utils.getShortAt(
      rawData,
      14,
      this.littleEndian
    );

    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 16 + ctr * 8;
      this.dims[ctr] = niftiReader.Utils.getLongAt(
        rawData,
        index,
        this.littleEndian
      );
    }

    this.intent_p1 = niftiReader.Utils.getDoubleAt(
      rawData,
      80,
      this.littleEndian
    );
    this.intent_p2 = niftiReader.Utils.getDoubleAt(
      rawData,
      88,
      this.littleEndian
    );
    this.intent_p3 = niftiReader.Utils.getDoubleAt(
      rawData,
      96,
      this.littleEndian
    );

    for (ctr = 0; ctr < 8; ctr += 1) {
      index = 104 + ctr * 8;
      this.pixDims[ctr] = niftiReader.Utils.getDoubleAt(
        rawData,
        index,
        this.littleEndian
      );
    }

    this.vox_offset = niftiReader.Utils.getLongAt(
      rawData,
      168,
      this.littleEndian
    );

    this.scl_slope = niftiReader.Utils.getDoubleAt(
      rawData,
      176,
      this.littleEndian
    );
    this.scl_inter = niftiReader.Utils.getDoubleAt(
      rawData,
      184,
      this.littleEndian
    );

    this.cal_max = niftiReader.Utils.getDoubleAt(
      rawData,
      192,
      this.littleEndian
    );
    this.cal_min = niftiReader.Utils.getDoubleAt(
      rawData,
      200,
      this.littleEndian
    );

    this.slice_duration = niftiReader.Utils.getDoubleAt(
      rawData,
      208,
      this.littleEndian
    );

    this.toffset = niftiReader.Utils.getDoubleAt(
      rawData,
      216,
      this.littleEndian
    );

    this.slice_start = niftiReader.Utils.getLongAt(
      rawData,
      224,
      this.littleEndian
    );
    this.slice_end = niftiReader.Utils.getLongAt(
      rawData,
      232,
      this.littleEndian
    );

    this.description = niftiReader.Utils.getStringAt(rawData, 240, 240 + 80);
    this.aux_file = niftiReader.Utils.getStringAt(rawData, 320, 320 + 24);

    this.qform_code = niftiReader.Utils.getIntAt(
      rawData,
      344,
      this.littleEndian
    );
    this.sform_code = niftiReader.Utils.getIntAt(
      rawData,
      348,
      this.littleEndian
    );

    this.quatern_b = niftiReader.Utils.getDoubleAt(
      rawData,
      352,
      this.littleEndian
    );
    this.quatern_c = niftiReader.Utils.getDoubleAt(
      rawData,
      360,
      this.littleEndian
    );
    this.quatern_d = niftiReader.Utils.getDoubleAt(
      rawData,
      368,
      this.littleEndian
    );
    this.qoffset_x = niftiReader.Utils.getDoubleAt(
      rawData,
      376,
      this.littleEndian
    );
    this.qoffset_y = niftiReader.Utils.getDoubleAt(
      rawData,
      384,
      this.littleEndian
    );
    this.qoffset_z = niftiReader.Utils.getDoubleAt(
      rawData,
      392,
      this.littleEndian
    );

    for (ctrOut = 0; ctrOut < 3; ctrOut += 1) {
      for (ctrIn = 0; ctrIn < 4; ctrIn += 1) {
        index = 400 + (ctrOut * 4 + ctrIn) * 8;
        this.affine[ctrOut][ctrIn] = niftiReader.Utils.getDoubleAt(
          rawData,
          index,
          this.littleEndian
        );
      }
    }

    this.affine[3][0] = 0;
    this.affine[3][1] = 0;
    this.affine[3][2] = 0;
    this.affine[3][3] = 1;

    this.slice_code = niftiReader.Utils.getIntAt(
      rawData,
      496,
      this.littleEndian
    );
    this.xyzt_units = niftiReader.Utils.getIntAt(
      rawData,
      500,
      this.littleEndian
    );
    this.intent_code = niftiReader.Utils.getIntAt(
      rawData,
      504,
      this.littleEndian
    );
    this.intent_name = niftiReader.Utils.getStringAt(rawData, 508, 508 + 16);

    this.dim_info = niftiReader.Utils.getByteAt(rawData, 524);
    // original implementation adaption
    this.setExtendedHeader(rawData);
  };

  // decorate readers with methods for extended headers
  NIFTI_FORMATS.forEach((niftiFormat) => {
    niftiFormat.prototype.setExtendedHeader = function (rawData) {
      if (rawData.byteLength > niftiFormat.MAGIC_COOKIE) {
        this.extensionFlag[0] = niftiReader.Utils.getByteAt(
          rawData,
          niftiFormat.MAGIC_COOKIE
        );
        this.extensionFlag[1] = niftiReader.Utils.getByteAt(
          rawData,
          niftiFormat.MAGIC_COOKIE + 1
        );
        this.extensionFlag[2] = niftiReader.Utils.getByteAt(
          rawData,
          niftiFormat.MAGIC_COOKIE + 2
        );
        this.extensionFlag[3] = niftiReader.Utils.getByteAt(
          rawData,
          niftiFormat.MAGIC_COOKIE + 3
        );

        if (this.hasExtendedHeaderData(rawData)) {
          this.extensionSize = this.getExtensionSize(rawData);
          this.extensionCode = this.getExtensionCode(rawData);
        }
      }
    };

    /**
     * Simple check if there is extended data or not for given rawData.
     * Checking on byteLength(s) only (does not validate the data)
     */
    niftiFormat.prototype.hasExtendedHeaderData = function (rawData) {
      const extLocation = this.getExtensionLocation();

      if (this.isHDR && this.extensionFlag[0]) {
        console.info(
          'Extended header data for hdr file might produce inconsistent values'
        );
      }

      // not validating the header data itself. Just checking if there are enough bytes
      return (
        this.extensionFlag[0] &&
        rawData.byteLength >= extLocation + EXTENDED_HEADER_MIN_SIZE
      );
    };
  });
};

decorateNiftiReader(enhancedNiftiReader);

export { enhancedNiftiReader };
