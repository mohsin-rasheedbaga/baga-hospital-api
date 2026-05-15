import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hospital_id, employee_id, month, year, leaves_taken, bonuses, deductions } = body;

    if (!hospital_id || !employee_id || !month || !year) {
      return NextResponse.json(
        { error: 'hospital_id, employee_id, month, and year are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Get employee's basic_salary and monthly_leaves
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('basic_salary, monthly_leaves, full_name')
      .eq('id', parseInt(employee_id, 10))
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const basic_salary = employee.basic_salary || 0;
    const monthly_leaves = employee.monthly_leaves || 0;
    const actualLeaves = leaves_taken || 0;
    const bonusesAmount = bonuses || 0;
    const deductionsAmount = deductions || 0;

    // Calculate leave deduction
    const excessLeaves = Math.max(0, actualLeaves - monthly_leaves);
    const dailyRate = basic_salary / 30;
    const leave_deduction = Math.round(excessLeaves * dailyRate);

    // Calculate net salary
    const net_salary = basic_salary - leave_deduction + bonusesAmount - deductionsAmount;

    // Check if salary record already exists for this employee/month/year
    const { data: existingRecord } = await supabase
      .from('salary_records')
      .select('id')
      .eq('employee_id', parseInt(employee_id, 10))
      .eq('month', month)
      .eq('year', parseInt(year, 10))
      .single();

    if (existingRecord) {
      return NextResponse.json(
        { error: 'Salary record already exists for this employee, month, and year' },
        { status: 409 }
      );
    }

    // Insert salary record
    const { data: record, error } = await supabase
      .from('salary_records')
      .insert({
        hospital_id,
        employee_id: parseInt(employee_id, 10),
        month,
        year: parseInt(year, 10),
        basic_salary,
        leaves_taken: actualLeaves,
        leave_deduction,
        bonuses: bonusesAmount,
        deductions: deductionsAmount,
        net_salary,
        status: 'pending',
      })
      .select(`
        *,
        employee:employees(id, employee_id, full_name, designation)
      `)
      .single();

    if (error) {
      console.error('Salary generation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Salary generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
