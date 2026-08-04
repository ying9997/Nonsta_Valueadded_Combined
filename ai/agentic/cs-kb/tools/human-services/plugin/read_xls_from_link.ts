// ignore the lint error for the import
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck

// @ts-ignore
import { Args } from '@/runtime';
// @ts-ignore
import { Input, Output } from "@/typings/read_xls_from_link/read_xls_from_link";
import * as XLSX from 'xlsx';


/**
  * Each file needs to export a function named `handler`. This function is the entrance to the Tool.
  * @param {Object} args.input - input parameters, you can get test input value by input.xxx.
  * @param {Object} args.logger - logger instance used to print logs, injected by runtime
  * @returns {*} The return data of the function, which should match the declared output parameters.
  * 
  * Remember to fill in input/output in Metadata, it helps LLM to recognize and use tool.
  */
export async function handler({ input, logger }: Args<Input>): Promise<Output> {

    const link_to_read = input.link;
    
    // 分页参数（可选）
    const page = (input as any).page ? Number((input as any).page) : undefined;
    const pageSize = (input as any).pageSize ? Number((input as any).pageSize) : undefined;

    /* link_to_read is a string like "msg...., https://p3-bot-sign.byteimg.com/tos-cn-i-v4nquku3lp/1cd1ca81bf4b4671b641318c77a93c7d.xlsx~tplv-v4nquku3lp-image.image?rk3s=68e6b6b5&x-expires=1771996425&x-signature=FG%2FKtuTY%2F%2F8XkLul7a86sTa9Ogs%3D"
    we need to extract the url from the string
    */
    const url = link_to_read.match(/https?:\/\/[^\s]+/)[0];

    // retrieve the file from the url, it is a xlsx file
    const file = await fetch(url);
    const fileContent = await file.arrayBuffer();

    const workbook = XLSX.read(fileContent, { type: 'array' });

    const sheetName = workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const allData = XLSX.utils.sheet_to_json(sheet, { raw: true });

    // 分页处理
    let data = allData;
    let paginationInfo: {
        currentPage: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    } | null = null;

    if (page !== undefined && pageSize !== undefined) {
        const total = allData.length;
        const totalPages = Math.ceil(total / pageSize);
        const currentPage = Math.max(1, Math.min(page, totalPages)); // 确保页码在有效范围内
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        data = allData.slice(startIndex, endIndex);
        
        paginationInfo = {
            currentPage: currentPage,
            pageSize: pageSize,
            total: total,
            totalPages: totalPages,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        };
    }

    // make sure data is a json string
    const dataJsonString = JSON.stringify(data);

    const ret: any = {
        "data": dataJsonString,
    };

    // 如果有分页信息，添加到返回结果中
    if (paginationInfo) {
        ret.pagination = paginationInfo;
    }

    return ret;

};

